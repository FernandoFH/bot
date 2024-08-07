const { finalizeEvent, verifyEvent } = require('nostr-tools/pure');
const Config = require('./config');

const { Community } = require('../../../models');
const { toKebabCase, removeAtSymbol } = require('../../../util');

/// All events broadcasted are Parameterized Replaceable Events,
/// the event kind must be between 30000 and 39999
const kind = 38383;

const orderToTags = async order => {
  const expiration =
    Math.floor(Date.now() / 1000) +
    parseInt(process.env.ORDER_PUBLISHED_EXPIRATION_WINDOW);
  const fiat_amount = ['fa'];
  if (order.fiat_amount === undefined) {
    fiat_amount.push(order.min_amount.toString(), order.max_amount.toString());
  } else {
    fiat_amount.push(order.fiat_amount.toString());
  }
  const channel = removeAtSymbol(process.env.CHANNEL);
  let source = `https://t.me/${channel}/${order.tg_channel_message1}`;
  const tags = [];
  tags.push(['d', order.id]);
  tags.push(['k', order.type]);
  tags.push(['f', order.fiat_code]);
  tags.push(['s', toKebabCase(order.status)]);
  tags.push(['amt', order.amount.toString()]);
  tags.push(fiat_amount);
  tags.push(['pm', order.payment_method]);
  tags.push(['premium', order.price_margin.toString()]);
  if (order.community_id) {
    const community = await Community.findById(order.community_id);
    const group = removeAtSymbol(community.group);
    source = `https://t.me/${group}/${order.tg_channel_message1}`;
    tags.push(['community_id', order.community_id]);
  }
  tags.push(['source', source]);
  tags.push(['network', 'mainnet']);
  tags.push(['layer', 'lightning']);
  tags.push(['expiration', expiration.toString()]);
  tags.push(['y', 'lnp2pbot']);
  tags.push(['z', 'order']);

  return tags;
};

exports.createOrderEvent = async order => {
  const myPrivKey = Config.getPrivateKey();
  if (order.is_public === false) {
    return;
  }

  const created_at = Math.floor(Date.now() / 1000);
  const tags = await orderToTags(order);

  const event = finalizeEvent(
    {
      kind,
      created_at,
      tags,
      content: '',
    },
    myPrivKey
  );

  const ok = verifyEvent(event);
  if (!ok) {
    console.log('Event not verified');
    return;
  }

  return event;
};
