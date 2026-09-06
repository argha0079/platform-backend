import { aj } from '../config/arcjetConfig.js';
import { isSpoofedBot } from '@arcjet/inspect';
import logger from '../utils/logger.js';

export const arcjetMiddleware = async (req, res, next) => {
    const decision = await aj.protect(req, { requested: 5 }); // Deduct 5 tokens from the bucket
    logger.debug('Arcjet decision', decision);

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            return res.status(429).json({ error: 'Too Many Requests' });
        } else if (decision.reason.isBot()) {
            return res.status(403).json({ error: 'No bots allowed' });
        } else {
            return res.status(403).json({ error: 'Forbidden' });
        }
    } else if (decision.ip.isHosting()) {
        // Requests from hosting IPs are likely from bots, so they can usually be
        // blocked. However, consider your use case - if this is an API endpoint
        // then hosting IPs might be legitimate.
        // https://docs.arcjet.com/blueprints/vpn-proxy-detection
        return res.status(403).json({ error: 'Forbidden' });
    } else if (decision.results.some(isSpoofedBot)) {
        // Paid Arcjet accounts include additional verification checks using IP data.
        // Verification isn't always possible, so we recommend checking the decision
        // separately.
        // https://docs.arcjet.com/bot-protection/reference#bot-verification
        return res.status(403).json({ error: 'Forbidden' });
    } else {
        return next();
    }
};
