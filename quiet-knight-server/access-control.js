import { IdentityError } from './identity.js';

export async function requireAuthenticated(identities, req, cookie, { registered = true } = {}) {
  const player = await identities.authenticate(req.headers.authorization, cookie);
  if (!player || (registered && !player.registered))
    throw new IdentityError(401, 'An authenticated Quiet Knight account is required');
  return player;
}

export function ownsRoomSeat(room, token, playerId) {
  if (!room || !token || !playerId) return false;
  return (token === room.white_token && room.white_player?.id === playerId)
    || (token === room.black_token && room.black_player?.id === playerId);
}
