const config = require('./config.js');
const wanCheckServiceURL = config.get('wanCheckURL');
const logLocation = config.get('logLocation');
const logLevel = config.get('logLevel');
const log = require('./helpers/logger.js')(logLocation, logLevel);
const checkWanIp = require('./helpers/checkWanIp.js');

/**
 * Main function to update a domain and its entries
 *
 * @param {object} configDomain - domain object from config
 * @param {object} transIpDomain - domain object from transIp
 * @param {function} updateDnsEntries - callback function to update entry
 * @returns {Promise} *
 */
module.exports = async function checkDomain(configDomain, transIpDomain, updateDnsEntries) {


    if (!configDomain) {
        log.warn('No config domain received. Nothing to change.');
        return null;
    }

    if (!transIpDomain) {
        log.warn('No transIp domain received. Nothing to change.');
        return null;
    }

    const currentIP = await checkWanIp(wanCheckServiceURL);
    log.info(`Current ip: ${currentIP}`);

    const mappedEntries = transIpDomain.dnsEntries
        .map((dnsEntry) => {

            log.debug(`processing dnsEntry ${JSON.stringify(dnsEntry)} for domain ${transIpDomain.name}`);

            const configEntry = configDomain.dnsEntries
                .find(configEntry => configEntry.name === dnsEntry.name && configEntry.type === dnsEntry.type);

            if (configEntry) {
                const content = configEntry.content || currentIP;

                if (content !== dnsEntry.content) {
                    log.info('Entry changed: ', currentIP);
                    //Merge the current entry with ours
                    const updatedEntry = Object.assign({}, dnsEntry, { content });

                    return {
                        changed: true,
                        dnsEntry: updatedEntry
                    };
                }
            }

            return {
                changed: false,
                dnsEntry
            };
        });

    if (mappedEntries.every(({ changed }) => !changed)) {
        log.info('Nothing changed.');
        return null;
    }

    const updatedEntries = mappedEntries.map(({ dnsEntry }) => dnsEntry);
    return updateDnsEntries(transIpDomain.name, updatedEntries);
};

