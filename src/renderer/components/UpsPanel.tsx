import React, { useState } from 'react';
import DataTable from './DataTable';
import EventLog from './EventLog';
import SettingsDialog from './SettingsDialog';

interface UpsPanelProps {
  upsId: 1 | 2;
  title: string;
  data: Record<string, string>;
  logs: string[];
  alarmActive: boolean;
  thresholdStates: Record<string, 'low' | 'high' | 'normal' | undefined>;
  onClearLogs: () => void;
}

const UpsPanel: React.FC<UpsPanelProps> = ({
  upsId,
  title,
  data,
  logs,
  alarmActive,
  thresholdStates,
  onClearLogs,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  const handleMuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMuted = e.target.checked;
    setMuted(nextMuted);
    window.electronAPI.setAlarmMute(upsId, nextMuted);
  };

  const handleClearLog = () => {
    window.electronAPI.clearLog(upsId);
    onClearLogs();
  };

  return (
    <div className="flex flex-row gap-3 h-full p-2 overflow-hidden">
      {/* Left side: header + data table */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex flex-row items-center mb-1 flex-shrink-0">
          <span className="font-bold text-base text-gray-800">{title}</span>
          <div className="flex-1" />
          <button
            className="px-3 py-1 text-sm bg-white hover:bg-gray-100 rounded border border-gray-300"
            onClick={() => setSettingsOpen(true)}
          >
            설정
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <DataTable data={data} thresholdStates={thresholdStates} />
        </div>
      </div>

      {/* Right side: event log header + event log */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex flex-row items-center mb-1 flex-shrink-0">
          <span className="font-bold text-sm text-gray-800">이벤트 로그</span>
          <div className="flex-1" />
          <label className="flex items-center gap-1 text-sm mr-2 cursor-pointer select-none text-gray-600">
            <input
              type="checkbox"
              checked={muted}
              onChange={handleMuteChange}
              className="cursor-pointer"
            />
            음소거
          </label>
          <button
            className="px-3 py-1 text-sm bg-white hover:bg-gray-100 rounded border border-gray-300"
            onClick={handleClearLog}
          >
            로그 초기화
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <EventLog logs={logs} />
        </div>
      </div>

      {settingsOpen && (
        <SettingsDialog
          upsId={upsId}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default UpsPanel;
