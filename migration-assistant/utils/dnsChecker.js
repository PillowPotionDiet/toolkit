/**
 * DNSChecker - DNS propagation checking utilities
 */

const dns = require('dns').promises;
const axios = require('axios');

class DNSChecker {
  /**
   * Check DNS record for a domain
   * @param {string} domain - Domain name
   * @param {string} recordType - Record type (A, AAAA, CNAME, MX, TXT)
   * @returns {Promise<Array>} DNS records
   */
  static async checkDNS(domain, recordType = 'A') {
    try {
      const resolver = new dns.Resolver();
      let records;

      switch (recordType.toUpperCase()) {
        case 'A':
          records = await resolver.resolve4(domain);
          break;
        case 'AAAA':
          records = await resolver.resolve6(domain);
          break;
        case 'CNAME':
          records = await resolver.resolveCname(domain);
          break;
        case 'MX':
          records = await resolver.resolveMx(domain);
          break;
        case 'TXT':
          records = await resolver.resolveTxt(domain);
          break;
        default:
          throw new Error(`Unsupported record type: ${recordType}`);
      }

      return records || [];
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if domain points to specific IP
   * @param {string} domain - Domain name
   * @param {string} expectedIP - Expected IP address
   * @returns {Promise<{matches: boolean, currentIP: string|null, expectedIP: string}>}
   */
  static async checkIPMatch(domain, expectedIP) {
    try {
      const records = await this.checkDNS(domain, 'A');

      if (records.length === 0) {
        return {
          matches: false,
          currentIP: null,
          expectedIP: expectedIP,
          message: 'No DNS records found'
        };
      }

      const currentIP = records[0];
      const matches = currentIP === expectedIP;

      return {
        matches: matches,
        currentIP: currentIP,
        expectedIP: expectedIP,
        message: matches
          ? 'DNS is correctly configured'
          : `DNS points to ${currentIP} instead of ${expectedIP}`
      };
    } catch (error) {
      return {
        matches: false,
        currentIP: null,
        expectedIP: expectedIP,
        error: error.message
      };
    }
  }

  /**
   * Check DNS propagation across multiple locations
   * @param {string} domain - Domain name
   * @param {string} expectedIP - Expected IP address
   * @returns {Promise<object>} Propagation status
   */
  static async checkPropagation(domain, expectedIP) {
    // Use external DNS checkers for global propagation check
    const dnsServers = [
      { name: 'Google DNS', server: '8.8.8.8' },
      { name: 'Cloudflare DNS', server: '1.1.1.1' },
      { name: 'OpenDNS', server: '208.67.222.222' },
      { name: 'Quad9', server: '9.9.9.9' }
    ];

    const results = [];

    for (const dnsServer of dnsServers) {
      try {
        const resolver = new dns.Resolver();
        resolver.setServers([dnsServer.server]);

        const records = await resolver.resolve4(domain);
        const currentIP = records[0];

        results.push({
          server: dnsServer.name,
          ip: dnsServer.server,
          resolvedIP: currentIP,
          matches: currentIP === expectedIP,
          status: currentIP === expectedIP ? 'propagated' : 'not_propagated'
        });
      } catch (error) {
        results.push({
          server: dnsServer.name,
          ip: dnsServer.server,
          resolvedIP: null,
          matches: false,
          status: 'error',
          error: error.message
        });
      }
    }

    const propagatedCount = results.filter(r => r.matches).length;
    const totalCount = results.length;
    const propagationPercentage = Math.round((propagatedCount / totalCount) * 100);

    return {
      domain: domain,
      expectedIP: expectedIP,
      servers: results,
      propagationPercentage: propagationPercentage,
      isFullyPropagated: propagationPercentage === 100,
      summary: `${propagatedCount}/${totalCount} DNS servers updated`
    };
  }

  /**
   * Get nameservers for a domain
   * @param {string} domain - Domain name
   * @returns {Promise<Array<string>>}
   */
  static async getNameservers(domain) {
    try {
      const resolver = new dns.Resolver();
      const nameservers = await resolver.resolveNs(domain);
      return nameservers;
    } catch (error) {
      return [];
    }
  }

  /**
   * Reverse DNS lookup
   * @param {string} ip - IP address
   * @returns {Promise<Array<string>>}
   */
  static async reverseLookup(ip) {
    try {
      const resolver = new dns.Resolver();
      const hostnames = await resolver.reverse(ip);
      return hostnames;
    } catch (error) {
      return [];
    }
  }

  /**
   * Estimate DNS propagation time
   * @returns {object} Propagation time estimates
   */
  static getPropagationEstimate() {
    return {
      minimum: '1-2 hours',
      average: '4-8 hours',
      maximum: '24-48 hours',
      note: 'TTL settings and caching can affect propagation time'
    };
  }

  /**
   * Generate DNS instructions for manual update
   * @param {Array} domains - List of domains
   * @param {string} newIP - New IP address
   * @param {string} oldIP - Old IP address
   * @returns {string} Formatted instructions
   */
  static generateDNSInstructions(domains, newIP, oldIP = null) {
    let instructions = `DNS UPDATE INSTRUCTIONS\n`;
    instructions += `Generated on: ${new Date().toLocaleString()}\n\n`;
    instructions += `=================================================\n\n`;

    instructions += `NEW SERVER IP ADDRESS: ${newIP}\n`;
    if (oldIP) {
      instructions += `OLD SERVER IP ADDRESS: ${oldIP}\n`;
    }
    instructions += `\n`;

    instructions += `DOMAINS TO UPDATE:\n`;
    instructions += `------------------\n`;
    domains.forEach((domain, index) => {
      instructions += `${index + 1}. ${domain}\n`;
    });
    instructions += `\n`;

    instructions += `STEP-BY-STEP INSTRUCTIONS:\n`;
    instructions += `---------------------------\n`;
    instructions += `1. Login to your DNS provider (where your domain's nameservers point)\n`;
    instructions += `   - This could be: Cloudflare, Namecheap, GoDaddy, Google Domains, etc.\n\n`;

    instructions += `2. Find DNS Management / DNS Settings / DNS Zone Editor\n\n`;

    instructions += `3. For EACH domain listed above:\n`;
    instructions += `   a. Look for the A record (or @ record)\n`;
    if (oldIP) {
      instructions += `   b. Change the IP address from ${oldIP} to ${newIP}\n`;
    } else {
      instructions += `   b. Change the IP address to ${newIP}\n`;
    }
    instructions += `   c. Save the changes\n\n`;

    instructions += `4. Wait for DNS propagation (24-48 hours)\n\n`;

    instructions += `IMPORTANT WARNINGS:\n`;
    instructions += `-------------------\n`;
    instructions += `- Keep your old hosting active for at least 48-72 hours\n`;
    instructions += `- Do NOT cancel old hosting immediately after migration\n`;
    instructions += `- Test your website using the new IP before DNS update\n`;
    instructions += `- DNS changes cannot be instant - patience is required\n\n`;

    instructions += `VERIFICATION:\n`;
    instructions += `-------------\n`;
    instructions += `You can check if DNS has updated by:\n`;
    instructions += `1. Using online tools like: whatsmydns.net or dnschecker.org\n`;
    instructions += `2. Running: ping ${domains[0]} (should show ${newIP})\n`;
    instructions += `3. Using the built-in DNS checker in this tool\n\n`;

    instructions += `=================================================\n`;
    instructions += `For support, contact your DNS provider or hosting support.\n`;

    return instructions;
  }
}

module.exports = DNSChecker;
