import { useState } from 'react';
import { Icon } from './Icons';

export type TransitionTone = 'green' | 'amber' | 'red';

const TONE_COLORS: Record<TransitionTone, string> = {
  green: '#1E8449',
  amber: '#B7791F',
  red: '#C0392B',
};

/** Dialog tone for a target status (spec §4.19). */
export function toneFor(to: string): TransitionTone {
  if (['REJECTED', 'DENIED'].includes(to)) return 'red';
  if (['UNDER_REVIEW', 'PROCESSING'].includes(to)) return 'amber';
  return 'green';
}

/** Row-action button color: indigo forward, green terminal-positive, red reject/deny. */
export function actionColorFor(to: string): string {
  if (['REJECTED', 'DENIED'].includes(to)) return '#C0392B';
  if (['RESOLVED', 'APPROVED', 'READY', 'CLAIMED'].includes(to)) return '#1E8449';
  return '#5B5BD6';
}

export function actionLabelFor(to: string): string {
  const labels: Record<string, string> = {
    UNDER_REVIEW: 'Start review',
    RESOLVED: 'Resolve',
    REJECTED: 'Reject',
    APPROVED: 'Approve',
    DENIED: 'Deny',
    READY: 'Mark ready',
    CLAIMED: 'Mark claimed',
    PROCESSING: 'Start processing',
  };
  return labels[to] ?? to.replace(/_/g, ' ');
}

export interface TransitionRequest {
  /** Dialog heading, e.g. "Start review". */
  title: string;
  /** Mono sub-line under the title, e.g. the ticket id. */
  targetId: string;
  tone: TransitionTone;
  confirmLabel: string;
  withClaimFields?: boolean;
}

interface Props {
  request: TransitionRequest;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (values: { note?: string; claim_schedule?: string; claim_location?: string }) => void;
}

export default function TransitionDialog({ request, busy, onCancel, onConfirm }: Props) {
  const [note, setNote] = useState('');
  const [claimSchedule, setClaimSchedule] = useState('');
  const [claimLocation, setClaimLocation] = useState('');
  const color = TONE_COLORS[request.tone];

  const confirm = () => {
    onConfirm({
      note: note.trim() || undefined,
      ...(request.withClaimFields
        ? {
            claim_schedule: claimSchedule.trim() || undefined,
            claim_location: claimLocation.trim() || undefined,
          }
        : {}),
    });
  };

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="dialog" aria-modal="true" data-testid="transition-dialog">
        <div className="dialog-head">
          <span
            className="dialog-icon"
            style={{ background: `${color}1F`, color }}
            aria-hidden
          >
            <Icon name="check" />
          </span>
          <div>
            <div className="dialog-title">{request.title}</div>
            <div className="dialog-sub">{request.targetId}</div>
          </div>
        </div>
        <div className="dialog-fields">
          {request.withClaimFields && (
            <div className="form-grid-2">
              <label className="field">
                <span className="field-label">Claim date</span>
                <input
                  className="input"
                  type="date"
                  value={claimSchedule}
                  onChange={(e) => setClaimSchedule(e.target.value)}
                  data-testid="claim-date"
                />
              </label>
              <label className="field">
                <span className="field-label">Claim location</span>
                <input
                  className="input"
                  placeholder="e.g. City Hall, Window 3"
                  value={claimLocation}
                  onChange={(e) => setClaimLocation(e.target.value)}
                  data-testid="claim-location"
                />
              </label>
            </div>
          )}
          <label className="field">
            <span className="field-label">Note (attached to audit trail)</span>
            <textarea
              className="input"
              placeholder="Add a note for this transition…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="transition-note"
            />
          </label>
        </div>
        <div className="dialog-foot">
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy} data-testid="dialog-cancel">
            Cancel
          </button>
          <button
            className="btn btn-status"
            style={{ background: color }}
            onClick={confirm}
            disabled={busy}
            data-testid="dialog-confirm"
          >
            {busy ? 'Applying…' : request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
