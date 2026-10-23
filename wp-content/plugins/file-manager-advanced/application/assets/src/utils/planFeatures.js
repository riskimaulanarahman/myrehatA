/**
 * Plan-based feature availability utility
 * Based on class-plan-features.php
 */

const PLAN_FEATURES = {
  basic: {
    dropbox: false,
    googledrive: false,
    onedrive: false,
    amazons3: false,
    github: false,
    googlecloud: false,
    pcloud: false,
    cloudflarer2: false,
    wasabi: false,
    digitalocean: false,
    email_notification: true,
    slack_notification: false,
    filelogs: true,
    adminer: false,
    frontend_access: true,
    public_access: true,
    role_based_access: true,
    individual_access: true,
    private_folders: false,
    hide_sensitive_files: true,
    multilingual: true,
    flexible_view: true,
    flexible_root: true,
    operations_control: true,
    complete_operations: true,
    advance_themes: false,
    gutenberg_blocks: true,
    code_editor_themes: false,
    ai_integration: false,
  },
  professional: {
    dropbox: true,
    googledrive: true,
    onedrive: true,
    amazons3: true,
    github: true,
    googlecloud: true,
    pcloud: true,
    cloudflarer2: true,
    wasabi: true,
    digitalocean: false,
    email_notification: true,
    slack_notification: true,
    filelogs: true,
    adminer: false,
    frontend_access: true,
    public_access: true,
    role_based_access: true,
    individual_access: true,
    private_folders: true,
    hide_sensitive_files: true,
    multilingual: true,
    flexible_view: true,
    flexible_root: true,
    operations_control: true,
    complete_operations: true,
    advance_themes: true,
    gutenberg_blocks: true,
    code_editor_themes: true,
    ai_integration: false,
  },
  business: {
    dropbox: true,
    googledrive: true,
    onedrive: true,
    amazons3: true,
    github: true,
    googlecloud: true,
    pcloud: true,
    cloudflarer2: true,
    wasabi: true,
    digitalocean: false, // Coming soon
    email_notification: true,
    slack_notification: true,
    filelogs: true,
    adminer: true,
    frontend_access: true,
    public_access: true,
    role_based_access: true,
    individual_access: true,
    private_folders: true,
    hide_sensitive_files: true,
    multilingual: true,
    flexible_view: true,
    flexible_root: true,
    operations_control: true,
    complete_operations: true,
    advance_themes: true,
    gutenberg_blocks: true,
    code_editor_themes: true,
    ai_integration: true,
  },
};

/**
 * Check if a feature is available for the current plan
 * @param {string} feature - Feature name
 * @param {string} currentPlan - Current plan ('free', 'basic', 'professional', 'business')
 * @param {boolean} hasPro - Whether Pro plugin is active
 * @returns {boolean}
 */
export function isFeatureAvailable(feature, currentPlan, hasPro) {
  if (!hasPro) {
    return false;
  }
  
  if (currentPlan === 'free') {
    return false;
  }
  
  if (!PLAN_FEATURES[currentPlan]) {
    return false;
  }
  
  return PLAN_FEATURES[currentPlan][feature] === true;
}

/**
 * Get the minimum plan required for a feature
 * @param {string} feature - Feature name
 * @returns {string|null} - Plan name or null if not available in any plan
 */
export function getFeatureMinPlan(feature) {
  if (PLAN_FEATURES.basic[feature] === true) {
    return 'basic';
  }
  if (PLAN_FEATURES.professional[feature] === true) {
    return 'professional';
  }
  if (PLAN_FEATURES.business[feature] === true) {
    return 'business';
  }
  return null;
}

