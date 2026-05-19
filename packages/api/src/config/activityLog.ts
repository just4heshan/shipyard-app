/**
 * Standardized action names written to ActivityLog.action.
 * The DB column is plain String — add new values here freely, no migration needed.
 */
export enum ActivityAction {
  // Member actions
  MEMBER_INVITED = "MEMBER_INVITED",
  MEMBER_REMOVED = "MEMBER_REMOVED",
  MEMBER_ROLE_UPDATED = "MEMBER_ROLE_UPDATED",
  // Invitation actions
  INVITATION_ACCEPTED = "INVITATION_ACCEPTED",
  INVITATION_CANCELLED = "INVITATION_CANCELLED",
  // Organization actions
  ORG_CREATED = "ORG_CREATED",
  // Project actions
  PROJECT_CREATED = "PROJECT_CREATED",
  PROJECT_UPDATED = "PROJECT_UPDATED",
  PROJECT_ARCHIVED = "PROJECT_ARCHIVED",
  PROJECT_UNARCHIVED = "PROJECT_UNARCHIVED",
  PROJECT_DELETED = "PROJECT_DELETED",
  // Task actions
  TASK_CREATED = "TASK_CREATED",
  TASK_UPDATED = "TASK_UPDATED",
  TASK_STATUS_UPDATED = "TASK_STATUS_UPDATED",
  TASK_ASSIGNED = "TASK_ASSIGNED",
  TASK_DELETED = "TASK_DELETED",
  // Comment actions
  COMMENT_CREATED = "COMMENT_CREATED",
  COMMENT_DELETED = "COMMENT_DELETED",
}

/**
 * Standardized entity type names written to ActivityLog.entityType.
 */
export enum EntityType {
  MEMBER = "MEMBER",
  INVITATION = "INVITATION",
  ORGANIZATION = "ORGANIZATION",
  PROJECT = "PROJECT",
  TASK = "TASK",
  COMMENT = "COMMENT",
}
