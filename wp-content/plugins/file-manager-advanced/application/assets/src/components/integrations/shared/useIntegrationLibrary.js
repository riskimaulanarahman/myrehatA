import { useState } from 'react';

/**
 * Custom hook for managing library installation for integrations
 * @param {string} integrationId - The integration ID (e.g., 'amazon-s3', 'google-cloud-storage')
 * @param {string} root - API root URL
 * @param {string} nonce - WordPress nonce
 * @param {boolean} hasPro - Whether user has Pro version
 * @returns {object} Library installation state and functions
 */
export function useIntegrationLibrary(integrationId, root, nonce, hasPro) {
  const [libraryInstalled, setLibraryInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  const installLibrary = async () => {
    if (!hasPro) {
      return { success: false, message: 'Pro version is required.' };
    }

    setInstalling(true);
    try {
      const apiUrl = `${root}file-manager-advanced/v1/integrations/${integrationId}/install-library`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setLibraryInstalled(true);
        return { success: true, message: data.message || 'Library installed successfully!' };
      } else {
        const errorMessage = data.message || data.data?.message || 'Failed to install library';
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error(`Error installing ${integrationId} library:`, error);
      return { success: false, message: `Failed to install ${integrationId} library` };
    } finally {
      setInstalling(false);
    }
  };

  return {
    libraryInstalled,
    setLibraryInstalled,
    installing,
    installLibrary
  };
}

