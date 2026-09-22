// src/app/(app)/video/page.tsx
'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Upload, Play, Loader, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface VideoAsset {
  id: string;
  title: string;
  session_id: string;
  upload_status: 'pending' | 'processing' | 'ready' | 'failed';
  analysis_status: 'pending' | 'processing' | 'complete' | 'failed';
  file_size: number;
  duration_seconds?: number;
  created_at: string;
}

export default function VideoPage() {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');

  React.useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user) return;

      const { data, error: fetchError } = await supabase
        .from('video_assets')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setVideos(data || []);
    } catch (err) {
      console.error('Failed to load videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile || !videoTitle.trim()) {
      setError('Please select a file and enter a title');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user) {
        setError('Not authenticated');
        return;
      }

      // Generate signed URL for upload
      const fileName = `${user.user.id}/${Date.now()}_${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create video asset record
      const { data: videoRecord, error: recordError } = (await (supabase
        .from('video_assets')
        .insert([{
          user_id: user.user.id,
          title: videoTitle.trim(),
          storage_path: uploadData.path,
          file_size: selectedFile.size,
          upload_status: 'ready',
          analysis_status: 'pending',
        }] as any)
        .select()
        .single())) as unknown as { data: any; error: any };

      if (recordError) throw recordError;

      // Update local state
      setVideos([videoRecord, ...videos]);
      setSelectedFile(null);
      setVideoTitle('');

      // Trigger analysis job (would be async background task)
      triggerAnalysisJob(videoRecord.id);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function triggerAnalysisJob(videoId: string) {
    try {
      const supabase = createClient();

      // Create analysis job record
      await (supabase.from('video_analysis_jobs').insert([{
        video_asset_id: videoId,
        status: 'pending',
        requested_at: new Date().toISOString(),
      }] as any));
    } catch (err) {
      console.error('Failed to trigger analysis:', err);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'processing':
        return 'default';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-red-600 to-pink-500 flex items-center justify-center shadow-lg">
              <Play className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Video Analysis</h1>
              <p className="text-sm text-zinc-400 mt-1">Upload clips for pose analysis and performance insights</p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="error" title="Error" className="mb-8">
            {error}
          </Alert>
        )}

        {/* Upload Section */}
        <Card className="border-zinc-800 bg-zinc-900/70 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-red-400" />
              Upload Video
            </CardTitle>
            <CardDescription>MP4, MOV, or WebM up to 500MB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                Video Title
              </label>
              <input
                type="text"
                placeholder="e.g., Shooting Drill - 3PT Range"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                Video File
              </label>
              <div className="border-2 border-dashed border-zinc-700/50 rounded-xl p-8 text-center hover:border-red-500/30 transition-colors">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="video-input"
                />
                <label htmlFor="video-input" className="cursor-pointer">
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-zinc-600 mx-auto" />
                    <div className="text-sm">
                      <span className="font-semibold text-zinc-300">Click to upload</span>
                      <span className="text-zinc-500"> or drag and drop</span>
                    </div>
                    {selectedFile && (
                      <div className="text-xs text-emerald-400 mt-2">
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !videoTitle.trim()}
              isLoading={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </Button>
          </CardContent>
        </Card>

        {/* Video List */}
        {videos.length > 0 ? (
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Play className="h-5 w-5 text-red-400" />
              Your Videos
            </h2>

            <div className="space-y-3">
              {videos.map((video) => (
                <Card key={video.id} className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="pt-1">{getStatusIcon(video.upload_status)}</div>
                        <div>
                          <h3 className="font-semibold text-white">{video.title}</h3>
                          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                            <span>{(video.file_size / 1024 / 1024).toFixed(1)} MB</span>
                            {video.duration_seconds && (
                              <>
                                <span>·</span>
                                <span>
                                  {Math.floor(video.duration_seconds / 60)}:
                                  {String(video.duration_seconds % 60).padStart(2, '0')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge variant={getStatusColor(video.upload_status) as any} className="text-xs block">
                          {video.upload_status}
                        </Badge>
                        {video.analysis_status !== 'pending' && (
                          <Badge variant={video.analysis_status === 'complete' ? 'success' : 'default'} className="text-xs block">
                            Analysis: {video.analysis_status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-12 text-center">
              <Play className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-300 mb-1">No videos yet</h3>
              <p className="text-sm text-zinc-400">Upload your first basketball video to get started with AI-powered analysis</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
