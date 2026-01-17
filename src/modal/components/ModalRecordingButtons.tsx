import { SaveIcon, MicVocal } from '../icons/icons';

export function ModalRecordingButtons({
  active,
  isScribing,
  handleStart,
  handleComplete,
}: {
  active: boolean;
  isScribing: boolean;
  handleStart: () => void;
  handleComplete: () => void;
}) {
  const StartButton = (
    <button
      className="scribe-btn scribe-btn-start"
      onClick={handleStart}
      type="button"
    >
      <MicVocal />
      Start
    </button>
  );
  const ActiveButtons = (
    <div className="scribe-active-buttons-container">
      <div className="scribe-buttons-row">
        <button
          className="scribe-btn scribe-btn-save"
          onClick={handleComplete}
          type="button"
          disabled={isScribing}
        >
          <SaveIcon />
          Complete
        </button>
      </div>
      {isScribing && <h2>♽ Scribe in progress</h2>}
    </div>
  );

  return (
    <div className="scribe-control-buttons-container">
      {active ? ActiveButtons : StartButton}
    </div>
  );
}
