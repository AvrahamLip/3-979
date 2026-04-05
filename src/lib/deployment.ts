/**
 * Utility to detect the current deployment environment based on the hostname.
 */

export const DOMAINS = {
  GITHUB_PAGES: 'avrahamlip.github.io',
  CLOUDFLARE: 'mountain-axes.mefakedpluga3979.workers.dev',
};

/**
 * Checks if the current environment is the Cloudflare Worker deployment.
 */
export const isCloudflareDeployment = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.includes('workers.dev') || hostname.includes('cloudflare');
};

/**
 * Checks if the current environment is the primary "Git" / GitHub Pages deployment.
 */
export const isGitHubPagesDeployment = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === DOMAINS.GITHUB_PAGES || hostname === 'localhost' || hostname === '127.0.0.1';
};

/**
 * Returns true if the commander dashboard should be accessible.
 * We allow it on GitHub Pages and local development.
 */
export const isCommanderDashboardAllowed = (): boolean => {
  // If we are NOT on Cloudflare, we allow it.
  // This covers localhost and github.io.
  return !isCloudflareDeployment();
};
