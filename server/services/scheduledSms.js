const Post = require('../models/Post');
const User = require('../models/User');
const Channel = require('../models/Channel');
const { canScheduleSms } = require('../utils/smsPermissions');
const { canUserAccessChannel, builtinMembershipMatch } = require('../utils/channelAccess');
const { resolveRecipientPhones } = require('./audienceResolver');
const { sendSmsBlastToRecipients } = require('./smsBlast');

async function runScheduledSms(now = new Date()) {
  const stats = { processed: 0 };
  for (let i = 0; i < 10; i++) {
    const post = await Post.findOneAndUpdate({ 'smsSchedule.status': 'pending', 'smsSchedule.sendAt': { $lte: now } },
      { $set: { 'smsSchedule.status': 'sending' } }, { new: true, sort: { 'smsSchedule.sendAt': 1 } });
    if (!post) break;
    let status = 'failed'; let counts = { attempted: 0, sent: 0, failed: 0 };
    try {
      const sender = await User.findById(post.authorId);
      const channel = await Channel.findOne({ slug: post.feed });
      const canPost = post.feed === 'chapterAnnouncements'
        ? ['officer', 'exec', 'webmaster'].some(role => (Array.isArray(sender?.role) ? sender.role : [sender?.role]).includes(role))
        : channel ? canUserAccessChannel(channel, sender) : builtinMembershipMatch(post.feed, sender) === true;
      if (!canScheduleSms(sender) || !canPost || channel?.isArchived) {
        status = 'cancelled';
      } else if (+now - +new Date(post.smsSchedule.sendAt) > 24 * 3600000) {
        status = 'cancelled';
      } else {
        const audience = post.blastAudience;
        const recipients = await resolveRecipientPhones({
          audienceType: audience.scope === 'INDIVIDUALS' ? 'specific' : audience.scope === 'ROLE_STATUS' ? 'roleStatus' : 'channel',
          channelSlug: audience.channelSlug || post.feed, includeRoles: audience.includeRoles,
          includeMemberStatuses: audience.includeMemberStatuses, selectedUserIds: audience.userIds,
        });
        const result = await sendSmsBlastToRecipients({ message: post.smsSchedule.message, recipients });
        counts = { attempted: result.attempted, sent: result.sent, failed: result.failed };
        status = result.failed ? (result.sent ? 'partial' : 'failed') : 'sent';
      }
    } catch {
      console.error('Scheduled text blast failed.', { postId: String(post._id) });
    }
    await Post.updateOne({ _id: post._id, 'smsSchedule.status': 'sending' }, { $set: {
      'smsSchedule.status': status, 'smsSchedule.attempted': counts.attempted,
      'smsSchedule.sent': counts.sent, 'smsSchedule.failed': counts.failed,
    } });
    stats.processed++;
  }
  return stats;
}
function startScheduledSms() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runScheduledSms(); } catch { console.error('Scheduled text scan failed.'); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(tick, 60000); timer.unref();
  return timer;
}
module.exports = { runScheduledSms, startScheduledSms };
