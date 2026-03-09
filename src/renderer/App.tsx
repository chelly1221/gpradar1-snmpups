import React from 'react';
import UpsPanel from './components/UpsPanel';
import Footer from './components/Footer';
import { useSnmpData } from './hooks/useSnmpData';

function App(): React.JSX.Element {
  const {
    ups1Data,
    ups2Data,
    ups1Logs,
    ups2Logs,
    ups1Alarm,
    ups2Alarm,
    ups1Thresholds,
    ups2Thresholds,
    clearLogs,
  } = useSnmpData();

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <div className="flex-[3] min-h-0">
        <UpsPanel
          upsId={1}
          title="제1레이더 UPS#1"
          data={ups1Data}
          logs={ups1Logs}
          alarmActive={ups1Alarm}
          thresholdStates={ups1Thresholds}
          onClearLogs={() => clearLogs(1)}
        />
      </div>

      <div className="h-px bg-gray-300 flex-shrink-0" />

      <div className="flex-[2] min-h-0">
        <UpsPanel
          upsId={2}
          title="제1레이더 UPS#2"
          data={ups2Data}
          logs={ups2Logs}
          alarmActive={ups2Alarm}
          thresholdStates={ups2Thresholds}
          onClearLogs={() => clearLogs(2)}
        />
      </div>

      <Footer />
    </div>
  );
}

export default App;
