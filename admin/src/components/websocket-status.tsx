'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';

export default function WebSocketStatus() {
  const { isConnected, error } = useWebSocket({
    enabled: true
  });

  return (
    <div className='fixed right-4 bottom-4 z-50'>
      <div
        className={`rounded-lg border px-3 py-2 text-sm shadow-lg ${
          isConnected
            ? 'border-green-200 bg-green-50 text-green-700'
            : error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-yellow-200 bg-yellow-50 text-yellow-700'
        }`}
      >
        <div className='flex items-center space-x-2'>
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected
                ? 'bg-green-500'
                : error
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
            }`}
          />
          <span>
            {isConnected
              ? 'Realtime Connected'
              : error
                ? 'Connection Failed'
                : 'Connecting...'}
          </span>
        </div>
        {error && <div className='mt-1 text-xs text-red-600'>{error}</div>}
      </div>
    </div>
  );
}
