import { ESocketEventType } from '../../interfaces/wsShared';
import { wsPublish } from '../../utils/ws';
import { createEventPayload } from '../../utils/wsShared';

export default function handleProgressUpdate({
  guildId,
  position,
}: {
  guildId: string;
  position: number;
}) {
  if (!guildId?.length) throw new TypeError('Missing guildId');

  const to = 'player/' + guildId;
  const d = createEventPayload(ESocketEventType.PROGRESS, position);

  // !TODO: debug log, remove when done
  // console.log({ publish: to, d });

  wsPublish(to, d);
}
