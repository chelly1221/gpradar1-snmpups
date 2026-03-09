import React from 'react';

interface DataTableProps {
  data: Record<string, string>;
  thresholdStates: Record<string, 'low' | 'high' | 'normal' | undefined>;
}

function getValueCellBackground(
  key: string,
  value: string,
  thresholdState: 'low' | 'high' | 'normal' | undefined,
): string | undefined {
  if (key === '출력 상태' || key === '배터리 상태') {
    if (value === '정상' || value === '온라인') {
      return '#32cd32';
    }
    return '#ff4c4c';
  }

  if (thresholdState === 'low' || thresholdState === 'high') {
    return '#ff4c4c';
  }

  return undefined;
}

const DataTable: React.FC<DataTableProps> = ({ data, thresholdStates }) => {
  const entries = Object.entries(data);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden border border-gray-300 rounded bg-white">
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          fontFamily: "'Pretendard', sans-serif",
          tableLayout: 'fixed',
        }}
      >
        <colgroup>
          <col style={{ width: '55%' }} />
          <col style={{ width: '45%' }} />
        </colgroup>

        <thead>
          <tr>
            <th
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                textAlign: 'center',
                padding: '6px 8px',
                borderBottom: '2px solid #9ca3af',
                borderRight: '1px solid #d1d5db',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: '#e5e7eb',
              }}
            >
              항목
            </th>
            <th
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                textAlign: 'center',
                padding: '6px 8px',
                borderBottom: '2px solid #9ca3af',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: '#e5e7eb',
              }}
            >
              값
            </th>
          </tr>
        </thead>

        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td
                colSpan={2}
                style={{
                  textAlign: 'center',
                  padding: '12px 8px',
                  color: '#6b7280',
                  fontSize: '13px',
                }}
              >
                불러오는 중...
              </td>
            </tr>
          ) : (
            entries.map(([key, value], index) => {
              const bg = getValueCellBackground(key, value, thresholdStates[key]);
              const isEven = index % 2 === 0;

              return (
                <tr
                  key={key}
                  style={{ backgroundColor: isEven ? '#f9fafb' : '#ffffff' }}
                >
                  <td
                    style={{
                      padding: '4px 8px',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {key}
                  </td>

                  <td
                    style={{
                      padding: '4px 8px',
                      borderBottom: '1px solid #e5e7eb',
                      textAlign: 'center',
                      fontSize: '13px',
                      backgroundColor: bg,
                      color: bg ? '#fff' : undefined,
                      fontWeight: bg ? 600 : undefined,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {value !== undefined && value !== '' ? value : '불러오는 중...'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
