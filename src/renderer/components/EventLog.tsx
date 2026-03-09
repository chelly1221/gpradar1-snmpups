import React, { useEffect, useRef, useMemo } from 'react';

interface EventLogProps {
  logs: string[];
}

const MAX_LOG_LINES = 500;

const EventLog: React.FC<EventLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  const visibleLogs = useMemo(
    () => logs.length > MAX_LOG_LINES ? logs.slice(logs.length - MAX_LOG_LINES) : logs,
    [logs]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [logs]);

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-white border border-gray-300 rounded p-2 font-mono text-xs text-gray-800 event-log">
      {visibleLogs.length === 0 ? (
        <div className="text-gray-400 text-center py-4">이벤트 없음</div>
      ) : (
        visibleLogs.map((line, index) => (
          <div key={index} className="whitespace-pre leading-5">
            {line}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default EventLog;
