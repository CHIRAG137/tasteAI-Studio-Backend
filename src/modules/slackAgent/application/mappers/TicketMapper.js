'use strict';

class TicketMapper {
  static toResponse(ticket) {
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      assignedTo: ticket.assignedToId,
      assignedTeam: ticket.assignedTeamId,
      createdBy: ticket.createdById,
      source: ticket.source,
      tags: ticket.tags,
      labels: ticket.labels,
      threadId: ticket.threadId,
      channelId: ticket.channelId,
      workspaceId: ticket.workspaceId,
      isEscalated: ticket.isEscalated,
      escalationLevel: ticket.escalationLevel,
      slaDueAt: ticket.slaDueAt,
      firstResponseAt: ticket.firstResponseAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      commentCount: ticket.comments?.length || 0,
      attachmentCount: ticket.attachments?.length || 0,
      watcherCount: ticket.watcherIds?.length || 0,
      followerCount: ticket.followerIds?.length || 0,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  static toListResponse(tickets) {
    return tickets.map((t) => TicketMapper.toResponse(t));
  }
}

module.exports = TicketMapper;
