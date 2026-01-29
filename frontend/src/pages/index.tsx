import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Dashboard } from '@/components/Dashboard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { apiClient } from '@/lib/api';
import { PingRecord, Statistics } from '@/types';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<{
    records: PingRecord[];
    stats: Statistics;
  } | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [records, stats] = await Promise.all([
          apiClient.getRecentRecords(60), // Last hour
          apiClient.getStatistics(24), // Last 24 hours
        ]);

        setInitialData({ records, stats });
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>HTTPBin Monitor - Real-time Monitoring Dashboard</title>
        <meta name="description" content="Real-time monitoring dashboard for httpbin.org requests" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        <Dashboard initialData={initialData} />
      </main>
    </>
  );
}
