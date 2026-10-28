import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, X, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ReceiptAttachment } from '../../types';

export function ReceiptCapture({ branchId, receipts, onChange, disabled = false, onBusyChange, inlineCamera = false }: {
  branchId: string; receipts: ReceiptAttachment[]; onChange: (receipts: ReceiptAttachment[]) => void;
  disabled?: boolean; onBusyChange?: (busy: boolean) => void;
  inlineCamera?: boolean;
}) {
  const { uploadReceipt, showNotification } = useApp();
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [taking, setTaking] = useState(false);
  const [cameraHelp, setCameraHelp] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const uploading = useRef(false);
  const openingRef = useRef(false);
  const takingRef = useRef(false);
  const latestReceipts = useRef(receipts);
  latestReceipts.current = receipts;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; streamRef.current?.getTracks().forEach(track => track.stop()); onBusyChange?.(false); };
  }, []);
  useEffect(() => {
    if (video.current && stream) { video.current.srcObject = stream; void video.current.play().catch(() => {}); }
  }, [stream]);
  const closeCamera = () => { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setStream(null); setCameraReady(false); };
  useEffect(() => {
    const hide = () => { if (document.hidden) closeCamera(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  const addFiles = async (files: File[]) => {
    if (uploading.current || disabled) return;
    if (files.length + latestReceipts.current.length > 8) { showNotification('Bir kayda en fazla 8 fotoğraf ekleyebilirsiniz.', 'warning'); return; }
    uploading.current = true; setBusy(true); setFailedFiles([]); onBusyChange?.(true);
    let completed = 0;
    try {
      for (const file of files) {
        if (!mounted.current) break;
        if (file.size > 20 * 1024 * 1024) throw new Error('Fotoğraf en fazla 20 MB olabilir.');
        const receipt = await uploadReceipt(branchId, file);
        completed++;
        if (mounted.current) {
          const next = [...latestReceipts.current, receipt]; latestReceipts.current = next; onChange(next);
        }
      }
    } catch (error) {
      if (mounted.current) { setFailedFiles(files.slice(completed)); showNotification(error instanceof Error ? error.message : 'Fotoğraf yüklenemedi.', 'warning'); }
    }
    finally { uploading.current = false; if (mounted.current) { setBusy(false); onBusyChange?.(false); } }
  };
  const openCamera = async () => {
    if (openingRef.current || streamRef.current || disabled || uploading.current) return;
    setCameraHelp('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraHelp('Canlı kamera için siteyi HTTPS ile açın. Telefon kameranızdan çekmek veya galeriden eklemek için aşağıdaki seçenekleri kullanabilirsiniz.');
      cameraInput.current?.click(); return;
    }
    openingRef.current = true; setOpening(true); onBusyChange?.(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } }, audio: false });
      if (!mounted.current || document.hidden) { media.getTracks().forEach(track => track.stop()); return; }
      streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = media; setStream(media);
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      setCameraHelp(name === 'NotAllowedError' ? 'Kamera izni verilmedi. Tarayıcının site ayarlarından kamera iznini açıp tekrar deneyin. Fotoğrafı telefon kamerası veya galeriden de ekleyebilirsiniz.' : 'Kamera açılamadı. Başka bir uygulama kullanıyor olabilir. Tekrar deneyin veya telefon kamerası / galeriden fotoğraf ekleyin.');
    } finally { openingRef.current = false; if (mounted.current) { setOpening(false); onBusyChange?.(false); } }
  };
  const takePhoto = async () => {
    if (takingRef.current || uploading.current || disabled || !video.current?.videoWidth) return;
    takingRef.current = true; setTaking(true); onBusyChange?.(true);
    try {
      let photo: Blob | null = null;
      const track = streamRef.current?.getVideoTracks()[0];
      const Capture = (window as unknown as { ImageCapture?: new (track: MediaStreamTrack) => { takePhoto: () => Promise<Blob> } }).ImageCapture;
      if (Capture && track) { try { photo = await new Capture(track).takePhoto(); } catch { /* Video snapshot fallback for unsupported devices. */ } }
      if (!photo || photo.size > 20 * 1024 * 1024) {
        const current = video.current; if (!current?.videoWidth) throw new Error('Kamera hazır değil. Tekrar deneyin.');
        const canvas = document.createElement('canvas');
        canvas.width = current.videoWidth; canvas.height = current.videoHeight;
        const context = canvas.getContext('2d'); if (!context) throw new Error('Fotoğraf işlenemedi.');
        context.drawImage(current, 0, 0);
        photo = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.96));
      }
      if (!photo) throw new Error('Fotoğraf çekilemedi. Tekrar deneyin.');
      if (!mounted.current) return;
      closeCamera();
      const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
      await addFiles([new File([photo], 'kamera-' + Date.now() + '.' + extension, { type: photo.type || 'image/jpeg' })]);
    } catch (error) { if (mounted.current) showNotification(error instanceof Error ? error.message : 'Fotoğraf çekilemedi.', 'warning'); }
    finally { takingRef.current = false; if (mounted.current) { setTaking(false); onBusyChange?.(false); } }
  };
  const fileChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files as FileList) : []; event.target.value = ''; void addFiles(files);
  };
  return <div className="receipt-capture space-y-2">
    <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0"><Camera className="w-5 h-5" /></div>
        <div><span className="text-xs font-bold text-zinc-200 block">Fiş, Fatura veya Kasa Z-Raporu</span>
          <span className="text-[11px] text-zinc-400">Kamerayla çekin veya fotoğraf ekleyin.</span></div>
      </div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={fileChanged} className="hidden" />
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={fileChanged} className="hidden" />
      <div className="flex flex-wrap gap-2 shrink-0">
        <button type="button" onClick={() => fileInput.current?.click()} disabled={disabled || busy || opening || taking || receipts.length >= 8}
          className="min-h-11 flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 disabled:opacity-50">
          <ImagePlus className="w-4 h-4 text-emerald-400" />Dosya Seç</button>
        <button type="button" onClick={() => void openCamera()} disabled={disabled || busy || opening || taking || !!stream || receipts.length >= 8}
          className="min-h-11 flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-semibold text-zinc-200 border border-zinc-700 disabled:opacity-50">
          <Camera className="w-4 h-4 text-emerald-400" />{busy ? 'Yükleniyor…' : opening ? 'Kamera açılıyor…' : 'Kamerayı Aç & Çek'}</button>
      </div>
    </div>
    {cameraHelp && <div role="status" className="p-3 rounded-xl border border-amber-500/20 text-xs text-amber-300 space-y-2"><p>{cameraHelp}</p><button type="button" disabled={busy || opening || taking || disabled} onClick={() => cameraInput.current?.click()} className="min-h-11 px-3 rounded-lg bg-zinc-800 text-zinc-200">Telefon Kamerası ile Çek</button></div>}
    {busy && <p role="status" className="text-xs text-emerald-400">Fotoğraf yükleniyor, lütfen bekleyin…</p>}
    {failedFiles.length > 0 && <div role="alert" className="p-3 rounded-xl border border-rose-500/30 text-xs text-rose-300 space-y-2">
      <p>{failedFiles.length} fotoğraf yüklenemedi. Başarıyla yüklenenler korunuyor.</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={disabled || busy || taking || opening} onClick={() => void addFiles(failedFiles)} className="min-h-11 px-3 rounded-lg bg-zinc-800 text-zinc-200">Yüklemeyi Tekrar Dene</button><button type="button" onClick={() => setFailedFiles([])} className="min-h-11 px-3 text-zinc-400">Vazgeç</button></div>
    </div>}
    {receipts.length > 0 && <div className="flex flex-wrap gap-2">{receipts.map(receipt => <div key={receipt.id} className="flex items-center gap-2 p-2 bg-zinc-950 border border-zinc-800 rounded-lg max-w-full">
      <a href={receipt.url} target="_blank" rel="noreferrer"><img src={receipt.url} alt={receipt.fileName} loading="lazy" decoding="async" width={48} height={48} className="w-12 h-12 object-cover rounded" /></a>
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span className="text-[11px] text-zinc-400 truncate max-w-32">{receipt.fileName}</span>
      <button type="button" disabled={disabled || busy || taking} title="Fotoğrafı kayıttan çıkar" onClick={() => onChange(receipts.filter(item => item.id !== receipt.id))} className="min-w-11 min-h-11 flex items-center justify-center text-zinc-400 hover:text-rose-400"><X className="w-4 h-4" /></button>
    </div>)}</div>}
    {stream && <div className={inlineCamera ? 'w-full py-3 flex items-center justify-center' : 'fixed inset-0 z-[80] bg-black/85 p-4 flex items-center justify-center'}>
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
        <div className="flex justify-between items-center"><span className="text-sm font-semibold">Fotoğraf Çek</span><button type="button" onClick={closeCamera} disabled={taking} title="Kamerayı kapat" className="min-h-11 min-w-11 flex items-center justify-center"><X className="w-5 h-5" /></button></div>
        <video ref={video} onLoadedMetadata={() => setCameraReady(true)} autoPlay playsInline muted className="w-full max-h-[65dvh] rounded-xl bg-black object-contain" />
        <p className="text-xs text-zinc-400">Fişi kadraja sığdırın, yazıların netleşmesini bekleyin.</p>
        <button type="button" onClick={() => void takePhoto()} disabled={!cameraReady || taking || disabled} className="w-full min-h-12 rounded-xl p-3 bg-emerald-500 text-zinc-950 font-bold text-sm disabled:opacity-50">{taking ? 'Fotoğraf işleniyor…' : 'Fotoğrafı Çek ve Ekle'}</button>
      </div>
    </div>}
  </div>;
}
