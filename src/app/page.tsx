'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [status, setStatus] = useState<string>('Checking Supabase connection...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('count()', { count: 'exact', head: true });

        if (error) {
          setError(`Connection error: ${error.message}`);
          setStatus('Failed to connect');
        } else {
          setStatus('✅ Connected to Supabase!');
        }
      } catch (err) {
        setError(`Unexpected error: ${err}`);
        setStatus('Failed to connect');
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-900">
      <main className="flex flex-col items-center justify-center gap-8 py-20 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            Chore List
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Next.js + Supabase + Vercel
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-center mb-4 text-black dark:text-white">
            Supabase Status
          </h2>

          <div className="text-center">
            <p className="text-lg font-medium mb-2 text-black dark:text-white">
              {status}
            </p>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Your Supabase project is configured and ready to use.
            </p>
            <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-500">
              <p>• Environment variables are configured</p>
              <p>• Supabase client is ready</p>
              <p>• Ready for deployment to Vercel</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Next steps:
          </p>
          <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 text-left">
            <li>1. Create tables in your Supabase database</li>
            <li>2. Update the query above to use your table</li>
            <li>3. Build your application features</li>
            <li>4. Deploy to Vercel with <code className="bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded">git push</code></li>
          </ol>
        </div>
      </main>
    </div>
  );
}
