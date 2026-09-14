'use client'

import { useEffect, useRef, useState } from 'react'

type ScanResult = 'valid' | 'used' | 'invalid' | null

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>
}

type BarcodeDetectorConstructor = new (options?: { formats: string[] }) => BarcodeDetectorLike

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor
  }
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult>(null)

  const validateCode = (code: string) => {
    const normalizedCode = code.trim().toUpperCase()
    setManualCode(normalizedCode)
    setScanResult(normalizedCode === 'ELR-001' ? 'valid' : normalizedCode === 'ELR-002' ? 'used' : 'invalid')
  }

  useEffect(() => {
    let active = true
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not available in this browser.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (!active || !videoRef.current) return
        streamRef.current = stream
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
        if (window.BarcodeDetector) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
          const scanFrame = async () => {
            if (!active || !videoRef.current || videoRef.current.readyState < 2) return
            const codes = await detector.detect(videoRef.current)
            if (codes[0]?.rawValue) validateCode(codes[0].rawValue)
            if (active && !scanResult) window.requestAnimationFrame(scanFrame)
          }
          window.requestAnimationFrame(scanFrame)
        }
      } catch {
        setCameraError('Camera permission was not granted. Enter the ticket code below instead.')
      }
    }
    startCamera()
    return () => {
      active = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [scanResult])

  return (
    <main className="scanner-shell">
      <header className="scanner-header"><a className="wordmark" href="/">ELORA<span>/</span></a><span>VENUE OPERATIONS / CHECK-IN</span><a href="/" className="scanner-exit">Exit scan ↗</a></header>
      <section className="scanner-main">
        <div className="scanner-intro"><p className="eyebrow">LAGOS AFTER DARK / 18 OCT 2026</p><h1>Check in<br /><strong>with confidence.</strong></h1><p>Point the venue phone at the attendee QR code. A valid ticket is checked once and recorded against the event.</p><div className="scanner-stats"><span><b>1,248</b> tickets sold</span><span><b>842</b> checked in</span></div></div>
        <div className="scanner-panel"><div className="camera-frame"><video ref={videoRef} muted playsInline aria-label="Ticket QR scanner" /><div className="scan-corners" /><div className="scan-line" />{!cameraReady && <div className="camera-placeholder"><span>QR</span><p>{cameraError || 'Starting secure camera...'}</p></div>}</div><div className="scanner-status"><span className={cameraReady ? 'status-dot status-dot--ready' : 'status-dot'} />{cameraReady ? 'Camera ready' : 'Manual verification available'}</div><div className="manual-entry"><label htmlFor="ticket-code">Manual ticket code</label><div><input id="ticket-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="ELR-001" /><button type="button" onClick={() => validateCode(manualCode)}>Verify</button></div></div>{scanResult && <div className={`scan-result scan-result--${scanResult}`}><strong>{scanResult === 'valid' ? 'Ticket valid' : scanResult === 'used' ? 'Already checked in' : 'Ticket not recognised'}</strong><span>{scanResult === 'valid' ? 'Entry approved. Welcome to Lagos After Dark.' : scanResult === 'used' ? 'This ticket was already used for entry.' : 'Check the code and try again.'}</span><button type="button" onClick={() => setScanResult(null)}>Scan next ticket</button></div>}</div>
      </section>
      <footer className="scanner-footer"><span>ELORA ACCESS CONTROL</span><span>Every scan is recorded securely</span></footer>
    </main>
  )
}
