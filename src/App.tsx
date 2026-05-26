import { useEffect, useRef, useState, useCallback } from 'react'
import Peer from 'peerjs'
import type { MediaConnection } from 'peerjs'
import './App.css'

/* ─── SVG Icons ─────────────────────────────────────────── */
const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
)
const VideoOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)
const MicOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.14a16 16 0 006.95 6.95l1.5-1.5a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
)
const PhoneOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m-2.67-3.34a19.79 19.79 0 01-3.07-8.63A2 2 0 014.18 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" />
    <line x1="23" y1="1" x2="1" y2="23" />
  </svg>
)
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const ScreenShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
  </svg>
)
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)

/* ─── Helpers ────────────────────────────────────────────── */
function formatTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

type CallState = 'idle' | 'calling' | 'receiving' | 'in-call'

/* ─── App ────────────────────────────────────────────────── */
export default function App() {
  const [peerId, setPeerId] = useState('')
  const [remotePeerId, setRemotePeerId] = useState('')
  const [callState, setCallState] = useState<CallState>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toastExiting, setToastExiting] = useState(false)
  const [incomingCallerId, setIncomingCallerId] = useState('')

  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerInstance = useRef<Peer | null>(null)
  const activeCall = useRef<MediaConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingCall = useRef<MediaConnection | null>(null)

  /* ── Toast helper ── */
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setToastExiting(false)
    setTimeout(() => {
      setToastExiting(true)
      setTimeout(() => setToast(null), 300)
    }, 3000)
  }, [])

  /* ── Start call timer ── */
  const startTimer = useCallback(() => {
    setCallDuration(0)
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  /* ── Attach stream to local video ── */
  const attachLocalStream = useCallback((stream: MediaStream) => {
    localStream.current = stream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
      localVideoRef.current.play().catch(() => {})
    }
  }, [])

  /* ── Get user media ── */
  const getMedia = useCallback((): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  }, [])

  /* ── Clean up call ── */
  const cleanupCall = useCallback(() => {
    activeCall.current?.close()
    activeCall.current = null
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop())
      localStream.current = null
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    stopTimer()
    setCallState('idle')
    setIsMuted(false)
    setIsCamOff(false)
    setIsSharingScreen(false)
  }, [stopTimer])

  /* ── Attach remote stream ── */
  const handleRemoteStream = useCallback((stream: MediaStream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream
      remoteVideoRef.current.play().catch(() => {})
    }
    setCallState('in-call')
    startTimer()
  }, [startTimer])

  /* ── PeerJS init ── */
  useEffect(() => {
    const peer = new Peer()
    peerInstance.current = peer

    peer.on('open', (id) => setPeerId(id))

    peer.on('call', (call) => {
      pendingCall.current = call
      setIncomingCallerId(call.peer)
      setCallState('receiving')
    })

    peer.on('error', (err) => {
      console.error('Peer error:', err)
      showToast(`Connection error: ${err.type}`)
      cleanupCall()
    })

    return () => { peer.destroy(); peerInstance.current = null }
  }, [showToast, cleanupCall])

  /* ── Make outgoing call ── */
  const makeCall = async () => {
    if (!remotePeerId.trim() || !peerInstance.current) return
    setCallState('calling')
    try {
      const stream = await getMedia()
      attachLocalStream(stream)
      const call = peerInstance.current.call(remotePeerId.trim(), stream)
      activeCall.current = call
      call.on('stream', handleRemoteStream)
      call.on('close', () => { cleanupCall(); showToast('Call ended') })
      call.on('error', () => { cleanupCall(); showToast('Call failed') })
    } catch {
      cleanupCall()
      showToast('Camera/mic access denied')
    }
  }

  /* ── Answer incoming call ── */
  const answerCall = async () => {
    if (!pendingCall.current) return
    const call = pendingCall.current
    pendingCall.current = null
    try {
      const stream = await getMedia()
      attachLocalStream(stream)
      call.answer(stream)
      activeCall.current = call
      call.on('stream', handleRemoteStream)
      call.on('close', () => { cleanupCall(); showToast('Call ended') })
      call.on('error', () => { cleanupCall(); showToast('Call failed') })
    } catch {
      cleanupCall()
      showToast('Camera/mic access denied')
    }
  }

  /* ── Reject incoming call ── */
  const rejectCall = () => {
    pendingCall.current?.close()
    pendingCall.current = null
    setCallState('idle')
    showToast('Call declined')
  }

  /* ── End call ── */
  const endCall = () => { cleanupCall(); showToast('Call ended') }

  /* ── Toggle mute ── */
  const toggleMute = () => {
    if (!localStream.current) return
    const audio = localStream.current.getAudioTracks()[0]
    if (audio) { audio.enabled = !audio.enabled; setIsMuted(!audio.enabled) }
  }

  /* ── Toggle camera ── */
  const toggleCamera = () => {
    if (!localStream.current) return
    const video = localStream.current.getVideoTracks()[0]
    if (video) { video.enabled = !video.enabled; setIsCamOff(!video.enabled) }
  }

  /* ── Screen share ── */
  const toggleScreenShare = async () => {
    if (!activeCall.current || !localStream.current) return
    if (isSharingScreen) {
      // Switch back to camera
      try {
        const camStream = await getMedia()
        const videoTrack = camStream.getVideoTracks()[0]
        const sender = (activeCall.current as unknown as { peerConnection: RTCPeerConnection })
          .peerConnection?.getSenders().find(s => s.track?.kind === 'video')
        if (sender && videoTrack) await sender.replaceTrack(videoTrack)
        localStream.current.getVideoTracks().forEach(t => t.stop())
        localStream.current.removeTrack(localStream.current.getVideoTracks()[0])
        localStream.current.addTrack(videoTrack)
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current
        setIsSharingScreen(false)
        showToast('Camera restored')
      } catch { showToast('Could not restore camera') }
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screen.getVideoTracks()[0]
        const sender = (activeCall.current as unknown as { peerConnection: RTCPeerConnection })
          .peerConnection?.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(screenTrack)
        screenTrack.onended = () => { setIsSharingScreen(false); showToast('Screen share stopped') }
        setIsSharingScreen(true)
        showToast('Sharing screen')
      } catch { showToast('Screen share cancelled') }
    }
  }

  /* ── Copy ID ── */
  const copyId = () => {
    if (!peerId) return
    navigator.clipboard.writeText(peerId).then(() => {
      setCopied(true)
      showToast('Peer ID copied!')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  /* ── Derived state labels ── */
  const statusLabel = {
    idle: 'Ready',
    calling: 'Calling…',
    receiving: 'Incoming call',
    'in-call': 'In call',
  }[callState]

  const isInCall = callState === 'in-call'
  const isBusy = callState !== 'idle'

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-icon">
            <VideoIcon />
          </div>
          <div className="logo-text">
            <h1>VideoCall</h1>
            <p>Peer-to-peer calls</p>
          </div>
        </div>

        {/* Status */}
        <div className="status-banner">
          <div className={`status-dot ${callState === 'idle' ? 'idle' : callState === 'calling' ? 'calling' : callState === 'receiving' ? 'calling' : 'in-call'}`} />
          <div className="status-info">
            <div className="status-label">Status</div>
            <div className="status-value">{statusLabel}</div>
          </div>
          {isInCall && (
            <div className="call-timer" style={{ fontSize: 14, letterSpacing: 1 }}>
              {formatTime(callDuration)}
            </div>
          )}
        </div>

        {/* Your ID */}
        <div>
          <div className="section-label">Your Peer ID</div>
          <div className="id-card">
            {peerId ? (
              <div className="id-row">
                <span className="id-value">{peerId}</span>
                <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copyId} title="Copy ID">
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            ) : (
              <div className="generating">
                <div className="spinner" />
                Generating ID…
              </div>
            )}
          </div>
        </div>

        <div className="divider" />

        {/* Call */}
        <div>
          <div className="section-label">Start a Call</div>
          <div className="input-group">
            <input
              className="peer-input"
              type="text"
              placeholder="Enter remote peer ID…"
              value={remotePeerId}
              onChange={e => setRemotePeerId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isBusy && makeCall()}
              disabled={isBusy}
            />
            {!isInCall ? (
              <button
                className="btn btn-primary"
                onClick={makeCall}
                disabled={!remotePeerId.trim() || isBusy || !peerId}
              >
                <PhoneIcon />
                {callState === 'calling' ? 'Calling…' : 'Call'}
              </button>
            ) : (
              <button className="btn btn-danger" onClick={endCall}>
                <PhoneOffIcon />
                End Call
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        {isInCall && (
          <>
            <div className="divider" />
            <div>
              <div className="section-label">Controls</div>
              <div className="controls-grid">
                <button
                  className={`ctrl-btn ${isMuted ? 'muted' : 'active'}`}
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOffIcon /> : <MicIcon />}
                  {isMuted ? 'Unmuted' : 'Muted'}
                </button>
                <button
                  className={`ctrl-btn ${isCamOff ? 'muted' : 'active'}`}
                  onClick={toggleCamera}
                  title={isCamOff ? 'Turn on camera' : 'Turn off camera'}
                >
                  {isCamOff ? <VideoOffIcon /> : <VideoIcon />}
                  {isCamOff ? 'Cam Off' : 'Cam On'}
                </button>
                <button
                  className={`ctrl-btn ${isSharingScreen ? 'active' : ''}`}
                  onClick={toggleScreenShare}
                  style={{ gridColumn: 'span 2' }}
                  title="Share screen"
                >
                  <ScreenShareIcon />
                  {isSharingScreen ? 'Stop Sharing' : 'Share Screen'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tips when idle */}
        {!isBusy && (
          <>
            <div className="divider" />
            <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <UsersIcon />
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>How to connect</span>
              </div>
              <ol style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Share your Peer ID with the person you want to call</li>
                <li>Enter their Peer ID in the field above</li>
                <li>Click <strong style={{ color: 'var(--accent-secondary)' }}>Call</strong> to start</li>
              </ol>
            </div>
          </>
        )}
      </aside>

      {/* ── Main Video Stage ── */}
      <main className="main-area">
        <div className="top-bar">
          <div className="top-bar-left">
            {isInCall && (
              <div className="call-quality">
                <div className="quality-dot" />
                Connected · {formatTime(callDuration)}
              </div>
            )}
          </div>
        </div>

        <div className="video-stage">
          {/* Remote video */}
          <div className="video-remote-wrapper">
            <video ref={remoteVideoRef} className="video-remote" autoPlay playsInline />
          </div>

          {/* Empty state (when not in call) */}
          {!isInCall && callState !== 'receiving' && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <VideoIcon />
              </div>
              <h2>No active call</h2>
              <p>Enter a peer ID in the sidebar to start a video call, or wait for someone to call you.</p>
            </div>
          )}

          {/* Incoming call overlay */}
          {callState === 'receiving' && (
            <div className="incoming-overlay">
              <div className="incoming-ring">
                <PhoneIcon />
              </div>
              <div className="incoming-title">Incoming Call</div>
              <div className="incoming-sub" style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent-secondary)' }}>
                {incomingCallerId}
              </div>
              <div className="incoming-actions">
                <button className="reject-btn" onClick={rejectCall} title="Decline">
                  <PhoneOffIcon />
                </button>
                <button className="answer-btn" onClick={answerCall} title="Answer">
                  <PhoneIcon />
                </button>
              </div>
            </div>
          )}

          {/* Calling spinner overlay */}
          {callState === 'calling' && (
            <div className="incoming-overlay">
              <div className="incoming-ring" style={{ animation: 'ring-pulse 1.5s ease-in-out infinite' }}>
                <PhoneIcon />
              </div>
              <div className="incoming-title">Calling…</div>
              <div className="incoming-sub" style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent-secondary)' }}>
                {remotePeerId}
              </div>
              <button
                className="btn btn-danger"
                style={{ width: 'auto', marginTop: 8 }}
                onClick={endCall}
              >
                <PhoneOffIcon /> Cancel
              </button>
            </div>
          )}

          {/* Local PiP */}
          {(isInCall || callState === 'calling') && (
            <div className="video-local-wrapper">
              {isCamOff ? (
                <div className="cam-off-overlay">
                  <VideoOffIcon />
                  <span>Camera off</span>
                </div>
              ) : (
                <video ref={localVideoRef} className="video-local" autoPlay playsInline muted />
              )}
              <div className="local-label">You</div>
            </div>
          )}
        </div>
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast ${toastExiting ? 'toast-exit' : ''}`}>
          {toast}
        </div>
      )}
    </div>
  )
}
