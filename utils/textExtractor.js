const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const logger = require('./logger');

/**
 * Extracts plain text from a PDF file at the given file path.
 * @param {string} filePath - Path to the uploaded PDF file.
 * @returns {Promise<string>} Extracted text from the PDF.
 */
exports.extractTextFromPDF = async (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(fileBuffer);

    // Clean and normalize extracted text
    const cleanedText = data.text.replace(/\s+/g, ' ').trim();

    return cleanedText;
  } catch (err) {
    logger.error('Error extracting text from PDF:', { filePath, error: err.message });
    return '';
  }
};

/**
 * Extracts plain text from a TXT file
 * @param {string} filePath - Path to the TXT file
 * @returns {Promise<string>} File content
 */
exports.extractTextFromTXT = async (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.replace(/\s+/g, ' ').trim();
  } catch (err) {
    logger.error('Error extracting text from TXT:', { filePath, error: err.message });
    return '';
  }
};

/**
 * Extracts plain text from a DOC/DOCX file
 * @param {string} filePath - Path to the DOC/DOCX file
 * @returns {Promise<string>} Extracted text
 */
exports.extractTextFromDOC = async (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value.replace(/\s+/g, ' ').trim();
  } catch (err) {
    logger.error('Error extracting text from DOC:', { filePath, error: err.message });
    return '';
  }
};

/**
 * Extracts structure information from XLSX/XLS/CSV file
 * Returns both raw text and column information for later use
 * @param {string} filePath - Path to the XLSX/XLS/CSV file
 * @returns {Promise<{text: string, sheets: Array, firstSheet: {name: string, columns: Array, data: Array}}>}
 */
exports.extractDataFromSpreadsheet = async (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    if (sheetNames.length === 0) {
      logger.warn('Spreadsheet has no sheets', { filePath });
      return { text: '', sheets: [], firstSheet: null };
    }

    // Get first sheet by default (for CSV, there's typically only one)
    const firstSheetName = sheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // For text processing, concatenate all data
    let fullText = `Spreadsheet: ${firstSheetName}\n`;

    if (jsonData.length === 0) {
      logger.warn('Spreadsheet is empty', { filePath, sheetName: firstSheetName });
      return {
        text: '',
        sheets: sheetNames,
        firstSheet: {
          name: firstSheetName,
          columns: [],
          data: [],
          rowCount: 0,
        },
      };
    }

    // Get column names
    const columns = Object.keys(jsonData[0]);
    fullText += `Columns: ${columns.join(', ')}\n\n`;

    // Convert data to readable text
    jsonData.forEach((row, idx) => {
      fullText += `Row ${idx + 1}: ${JSON.stringify(row)}\n`;
    });

    return {
      text: fullText.replace(/\s+/g, ' ').trim(),
      sheets: sheetNames,
      firstSheet: {
        name: firstSheetName,
        columns,
        data: jsonData,
        rowCount: jsonData.length,
      },
    };
  } catch (err) {
    logger.error('Error extracting data from spreadsheet:', { filePath, error: err.message });
    return { text: '', sheets: [], firstSheet: null };
  }
};

/**
 * Generic file extractor that determines file type and extracts accordingly
 * @param {Object} file - Multer file object with path, mimetype, originalname
 * @param {string} fileType - Optional file type override (pdf, txt, doc, xlsx, xls, csv)
 * @returns {Promise<Object>} Extracted data with type info
 */
exports.extractFromFile = async (file, fileType = null) => {
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    const type = fileType || detectFileType(file.mimetype, ext);

    logger.info('Extracting text from file', {
      filename: file.originalname,
      type,
      size: file.size,
    });

    const result = { type, content: '', metadata: {} };

    switch (type) {
      case 'pdf':
        result.content = await exports.extractTextFromPDF(file.path);
        break;
      case 'txt':
        result.content = await exports.extractTextFromTXT(file.path);
        break;
      case 'doc':
      case 'docx':
        result.content = await exports.extractTextFromDOC(file.path);
        break;
      case 'xlsx':
      case 'xls':
      case 'csv':
        const spreadsheetData = await exports.extractDataFromSpreadsheet(file.path);
        result.content = spreadsheetData.text;
        result.metadata = {
          sheets: spreadsheetData.sheets,
          firstSheet: spreadsheetData.firstSheet,
          isSpreadsheet: true,
        };
        break;
      default:
        logger.error('Unsupported file type', { type, filename: file.originalname });
        throw new Error(`Unsupported file type: ${type}`);
    }

    return result;
  } catch (err) {
    logger.error('Error in extractFromFile:', { error: err.message });
    throw err;
  }
};

/**
 * Detect file type from MIME type and extension
 * @param {string} mimetype - MIME type from multer
 * @param {string} ext - File extension
 * @returns {string} Detected file type
 */
function detectFileType(mimetype, ext) {
  if (ext === '.pdf' || mimetype === 'application/pdf') {
    return 'pdf';
  }
  if (ext === '.txt' || mimetype === 'text/plain') {
    return 'txt';
  }
  if (ext === '.doc' || ext === '.docx' || mimetype.includes('word')) {
    return 'doc';
  }
  if (ext === '.xlsx' || mimetype.includes('spreadsheetml')) {
    return 'xlsx';
  }
  if (ext === '.xls' || mimetype === 'application/vnd.ms-excel') {
    return 'xls';
  }
  if (ext === '.csv' || mimetype === 'text/csv' || mimetype === 'application/csv') {
    return 'csv';
  }

  // Fallback to extension
  return ext.replace(/^\./, '').toLowerCase();
}
