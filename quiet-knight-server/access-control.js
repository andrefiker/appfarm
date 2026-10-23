import { IdentityError } from './identity.js';

export async function requireAuthenticated(identities, req, cookie, { registered = true } = {}) {
  const player = await identities.authenticate(req.headers.authorization, cookie);
  if (!player || (registered && !player.registered))
    throw new IdentityError(401, 'An authenticated Quiet Knight account is required');
  return player;
}

export function ownsRoomSeat(room, token, playerId) {
  if (!room || !token) return false;
  const side = token === room.white_token ? 'white'
    : token === room.black_token ? 'black' : null;
  if (!side) return false;
  const owner = room[side + '_player']?.id;
  // Anonymous seats are capabilities: the private token is still mandatory.
  // Account-owned seats additionally require the original account identity.
  return owner ? owner === playerId : true;
}
