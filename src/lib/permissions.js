// ============================================================================
// TKMAA — Centralized Permission Definitions
// Role Hierarchy: super_admin > branch_admin > sport_admin > trainer > student
// ============================================================================

/**
 * All application roles, ordered by authority (highest first).
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BRANCH_ADMIN: 'branch_admin',
  SPORT_ADMIN: 'sport_admin',
  TRAINER: 'trainer',
  STUDENT: 'student',
  PARENT: 'parent',
}

/**
 * Role display names for the UI.
 */
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Overall Admin',
  [ROLES.BRANCH_ADMIN]: 'Branch Admin',
  [ROLES.SPORT_ADMIN]: 'Sports Admin',
  [ROLES.TRAINER]: 'Trainer',
  [ROLES.STUDENT]: 'Student',
  [ROLES.PARENT]: 'Parent',
}

/**
 * Role hierarchy level (lower number = higher authority).
 */
export const ROLE_LEVEL = {
  [ROLES.SUPER_ADMIN]: 0,
  [ROLES.BRANCH_ADMIN]: 1,
  [ROLES.SPORT_ADMIN]: 2,
  [ROLES.TRAINER]: 3,
  [ROLES.STUDENT]: 4,
  [ROLES.PARENT]: 4,
}

// ── Permission Definitions ──
// Each key is a permission name; its value is the array of roles allowed.

export const PERMISSIONS = {
  // ── Branch Management ──
  CREATE_BRANCH:          [ROLES.SUPER_ADMIN],
  EDIT_BRANCH:            [ROLES.SUPER_ADMIN],
  DELETE_BRANCH:          [ROLES.SUPER_ADMIN],
  VIEW_ALL_BRANCHES:      [ROLES.SUPER_ADMIN],
  MANAGE_BRANCH_DETAILS:  [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],

  // ── Sport Management ──
  CREATE_SPORT:           [ROLES.SUPER_ADMIN],
  EDIT_SPORT:             [ROLES.SUPER_ADMIN],
  DELETE_SPORT:           [ROLES.SUPER_ADMIN],
  VIEW_ALL_SPORTS:        [ROLES.SUPER_ADMIN],

  // ── User / Role Management ──
  CREATE_BRANCH_ADMIN:    [ROLES.SUPER_ADMIN],
  ASSIGN_BRANCH_ADMIN:    [ROLES.SUPER_ADMIN],
  CREATE_SPORT_ADMIN:     [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
  ASSIGN_TRAINER:         [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],
  USER_MANAGEMENT:        [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
  SUBSCRIPTION_MANAGEMENT:[ROLES.SUPER_ADMIN],
  SYSTEM_SETTINGS:        [ROLES.SUPER_ADMIN],

  // ── Student Management ──
  STUDENT_ADMISSION:      [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],
  STUDENT_PROMOTION:      [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
  VIEW_STUDENTS:          [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER],
  MANAGE_SPORT_STUDENTS:  [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],

  // ── Trainer Management ──
  VIEW_TRAINERS:          [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],
  MANAGE_SPORT_TRAINERS:  [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],

  // ── Batch Management ──
  CREATE_BATCH:           [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],
  BATCH_SCHEDULING:       [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],
  VIEW_BATCHES:           [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER],

  // ── Attendance ──
  MARK_ATTENDANCE:        [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER],
  VIEW_ATTENDANCE:        [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER],

  // ── Fees & Payments ──
  FEE_COLLECTION:         [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
  FEE_TRACKING:           [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],
  VIEW_FEE_REPORTS:       [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],

  // ── Tournaments ──
  CREATE_TOURNAMENT:      [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],
  TOURNAMENT_ENTRIES:     [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],
  TOURNAMENT_RECOMMEND:   [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER],
  VIEW_TOURNAMENTS:       [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER, ROLES.STUDENT],

  // ── Grading & Progress ──
  SKILL_GRADING:          [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],
  ENTER_GRADING_RESULTS:  [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER],
  ADD_PROGRESS_NOTES:     [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER],

  // ── Reports ──
  GLOBAL_REPORTS:         [ROLES.SUPER_ADMIN],
  BRANCH_REPORTS:         [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
  SPORT_REPORTS:          [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],

  // ── Inventory ──
  MANAGE_INVENTORY:       [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],

  // ── Certificates ──
  MANAGE_CERTIFICATES:    [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
  VIEW_CERTIFICATES:      [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER, ROLES.STUDENT],

  // ── Notifications ──
  SEND_NOTIFICATIONS:     [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER],
  VIEW_NOTIFICATIONS:     [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER, ROLES.STUDENT, ROLES.PARENT],

  // ── Audit ──
  VIEW_AUDIT_LOGS:        [ROLES.SUPER_ADMIN],

  // ── Transfers ──
  TRANSFER_STUDENTS:      [ROLES.SUPER_ADMIN],
  TRANSFER_TRAINERS:      [ROLES.SUPER_ADMIN],

  // ── Internal Competitions ──
  INTERNAL_COMPETITIONS:  [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN],

  // ── Student Self-Service ──
  VIEW_OWN_PROFILE:       [ROLES.STUDENT, ROLES.PARENT],
  VIEW_OWN_ATTENDANCE:    [ROLES.STUDENT, ROLES.PARENT],
  VIEW_OWN_FEES:          [ROLES.STUDENT, ROLES.PARENT],
  VIEW_OWN_TOURNAMENTS:   [ROLES.STUDENT, ROLES.PARENT],
  VIEW_OWN_BELT:          [ROLES.STUDENT, ROLES.PARENT],
  VIEW_OWN_CERTIFICATES:  [ROLES.STUDENT, ROLES.PARENT],

  // ── Batch Communication ──
  BATCH_COMMUNICATION:    [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN, ROLES.TRAINER],
}

// ── Helper Functions ──

/**
 * Check if a role has a specific permission.
 * @param {string} role - User's role
 * @param {string} permission - Permission key from PERMISSIONS
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  // Backward compat: treat 'admin' as 'super_admin'
  const normalizedRole = role === 'admin' ? ROLES.SUPER_ADMIN : role
  const allowed = PERMISSIONS[permission]
  if (!allowed) return false
  return allowed.includes(normalizedRole)
}

/**
 * Check if a role is at or above a certain authority level.
 * @param {string} role - User's role
 * @param {string} minimumRole - The minimum role needed
 * @returns {boolean}
 */
export function hasRoleLevel(role, minimumRole) {
  const normalizedRole = role === 'admin' ? ROLES.SUPER_ADMIN : role
  const userLevel = ROLE_LEVEL[normalizedRole]
  const requiredLevel = ROLE_LEVEL[minimumRole]
  if (userLevel === undefined || requiredLevel === undefined) return false
  return userLevel <= requiredLevel
}

/**
 * Check if the user is any kind of admin (super_admin, branch_admin, sport_admin).
 */
export function isAdminRole(role) {
  const normalizedRole = role === 'admin' ? ROLES.SUPER_ADMIN : role
  return [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.SPORT_ADMIN].includes(normalizedRole)
}

/**
 * Check if the user is the top-level admin.
 */
export function isOverallAdmin(role) {
  const normalizedRole = role === 'admin' ? ROLES.SUPER_ADMIN : role
  return normalizedRole === ROLES.SUPER_ADMIN
}

/**
 * Check branch access — can this user access data from the given branch?
 * @param {object} permissions - The full permissions object from AuthContext
 * @param {string} branchId - The branch ID to check
 * @returns {boolean}
 */
export function canAccessBranch(permissions, branchId) {
  if (!permissions) return false
  // Overall Admin can access everything
  if (isOverallAdmin(permissions.role)) return true
  // Others can only access their assigned branches
  return permissions.branchIds.includes(branchId)
}

/**
 * Check sport access — can this user access data for the given sport?
 * @param {object} permissions - The full permissions object from AuthContext
 * @param {string} sportId - The sport ID to check
 * @returns {boolean}
 */
export function canAccessSport(permissions, sportId) {
  if (!permissions) return false
  // Overall Admin and Branch Admin can access all sports (in their branch)
  if (isOverallAdmin(permissions.role)) return true
  if (permissions.role === ROLES.BRANCH_ADMIN) return true
  // Sport admin / trainer can only access assigned sports
  return permissions.sportIds.includes(sportId)
}

/**
 * Full scope check: can the user access a resource with the given branch + sport?
 * @param {object} permissions
 * @param {string|null} branchId
 * @param {string|null} sportId
 * @returns {boolean}
 */
export function canAccessScope(permissions, branchId, sportId) {
  if (!permissions) return false
  if (isOverallAdmin(permissions.role)) return true
  
  // Check branch access
  if (branchId && !canAccessBranch(permissions, branchId)) return false
  // Check sport access
  if (sportId && !canAccessSport(permissions, sportId)) return false
  
  return true
}

/**
 * Get all permissions a role has (useful for debugging / UI).
 */
export function getPermissionsForRole(role) {
  const normalizedRole = role === 'admin' ? ROLES.SUPER_ADMIN : role
  return Object.entries(PERMISSIONS)
    .filter(([, roles]) => roles.includes(normalizedRole))
    .map(([perm]) => perm)
}
