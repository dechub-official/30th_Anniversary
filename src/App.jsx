import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import "@fontsource/italiana";
import "@fontsource/italianno";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import landingBackground from "./assets/images/landing/landing-page-image-2.png";
import mobileVideoFrameOverlay from "./assets/images/mobile/mobile-page-container-bc-image-3.png";
import mobileContainerBackground from "./assets/images/mobile/mobile-page-container-bc-image.png";
import mobilePageBackground from "./assets/images/mobile/mobile-page-bc-image.png";
import qrBackground from "./assets/images/qr/qr-page-image.png";
import qrImage from "./assets/images/qr/Untitled.jpeg";
import tanishq30image from "./assets/images/mobile/tanishq-30.png";
import tanishqlogo from "./assets/images/mobile/tanishq-logo.png";

const MOBILE_DRAFT_STORAGE_KEY = "tanishq-mobile-draft";
const MOBILE_SUBMISSION_STORAGE_KEY = "tanishq-mobile-submission-id";
const MOBILE_SUBMISSIONS_STORAGE_KEY = "tanishq-mobile-submissions";
const SubmissionContext = createContext(null);

function readStoredSubmissions() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedSubmissions = window.localStorage.getItem(
      MOBILE_SUBMISSIONS_STORAGE_KEY,
    );

    if (!storedSubmissions) {
      return [];
    }

    return JSON.parse(storedSubmissions);
  } catch {
    return [];
  }
}

function writeStoredSubmissions(submissions) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    MOBILE_SUBMISSIONS_STORAGE_KEY,
    JSON.stringify(submissions),
  );
}

function readStoredDraft() {
  if (typeof window === "undefined") {
    return { guestName: "", personalizedMessage: "" };
  }

  try {
    const storedDraft = window.localStorage.getItem(MOBILE_DRAFT_STORAGE_KEY);
    if (!storedDraft) {
      return { guestName: "", personalizedMessage: "" };
    }

    const parsedDraft = JSON.parse(storedDraft);

    return {
      guestName: parsedDraft.guestName || "",
      personalizedMessage: parsedDraft.personalizedMessage || "",
    };
  } catch {
    return { guestName: "", personalizedMessage: "" };
  }
}

function readStoredSubmissionId() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(MOBILE_SUBMISSION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function SubmissionProvider({ children }) {
  const [draft, setDraft] = useState(() => readStoredDraft());
  const [submissionId, setSubmissionId] = useState(() => readStoredSubmissionId());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(MOBILE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (submissionId) {
      window.localStorage.setItem(MOBILE_SUBMISSION_STORAGE_KEY, submissionId);
      return;
    }

    window.localStorage.removeItem(MOBILE_SUBMISSION_STORAGE_KEY);
  }, [submissionId]);

  return (
    <SubmissionContext.Provider
      value={{ draft, setDraft, submissionId, setSubmissionId }}
    >
      {children}
    </SubmissionContext.Provider>
  );
}

function useSubmissionDraft() {
  const context = useContext(SubmissionContext);

  if (!context) {
    throw new Error("useSubmissionDraft must be used inside SubmissionProvider.");
  }

  return context;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file payload."));
    reader.readAsDataURL(blob);
  });
}

function syncCanvasFrame(video, canvas) {
  const sourceWidth = video.videoWidth ;
  const sourceHeight = video.videoHeight;
  const canvasBounds = canvas.getBoundingClientRect();
  // const targetRatio =
  //   canvasBounds.width > 0 && canvasBounds.height > 0
  //     ? canvasBounds.width / canvasBounds.height
  //     : 9 / 16;

  const targetRatio = 4/7;

  const dominantSourceDimension = Math.max(sourceWidth, sourceHeight);
  const nextHeight = Math.max(1, Math.round(dominantSourceDimension));
  const nextWidth = Math.max(1, Math.round(nextHeight * targetRatio));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return false;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  const sourceRatio = sourceWidth / sourceHeight;

  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let cropX = 0;
  let cropY = 0;

  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    cropX = (sourceWidth - cropWidth) / 2;
  } else if (sourceRatio < targetRatio) {
    cropHeight = sourceWidth / targetRatio;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  context.drawImage(
    video,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return true;
}

async function submitSubmission(payload) {
  if (typeof window === "undefined") {
    throw new Error("Submissions are only available in the browser.");
  }

  const submissions = readStoredSubmissions();
  const submissionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}`;
  const submittedAt = new Date().toISOString();

  submissions.push({
    submissionId,
    submittedAt,
    ...payload,
    consentStatus: "pending",
    consentAt: null,
  });

  writeStoredSubmissions(submissions);

  return { ok: true, submissionId, savedAt: submittedAt };
}

async function updateSubmissionConsent(payload) {
  if (typeof window === "undefined") {
    throw new Error("Consent updates are only available in the browser.");
  }

  const submissions = readStoredSubmissions();
  const submissionIndex = submissions.findIndex(
    (item) => item.submissionId === payload.submissionId,
  );

  if (submissionIndex === -1) {
    throw new Error("Submission not found.");
  }

  submissions[submissionIndex] = {
    ...submissions[submissionIndex],
    consentStatus: payload.consentStatus,
    consentAt: new Date().toISOString(),
  };

  writeStoredSubmissions(submissions);

  return {
    ok: true,
    submissionId: payload.submissionId,
    consentStatus: payload.consentStatus,
  };
}

function ScreenPage({ className = "", children, background }) {
  const classes = ["screen-page", className].filter(Boolean).join(" ");

  return (
    <main
      className={classes}
      style={{ backgroundImage: `url(${background})` }}
    >
      <section className="screen-overlay">{children}</section>
    </main>
  );
}

function LandingPage() {
  const navigate = useNavigate();

  return (
    <ScreenPage background={landingBackground} className="landing-page">
      <button
        type="button"
        className="cta-button"
        onClick={() => navigate("/qr")}
      >
        Create your personal greeting
      </button>
    </ScreenPage>
  );
}

function QrPage() {
  return (
    <ScreenPage background={qrBackground} className="qr-page">
      <h1 className="qr-heading">
        Write / Click / Record your Wishes for Tanishq&apos;s 30th birthday
      </h1>
      <img className="qr-code" src={qrImage} alt="QR code for Tanishq wishes" />
      <p className="qr-caption">Scan the QR</p>
    </ScreenPage>
  );
}

function MobileHomePage() {
  const navigate = useNavigate();
  const { draft, setDraft } = useSubmissionDraft();
  const hasRequiredDraftFields =
    draft.guestName.trim() && draft.personalizedMessage.trim();

  function updateDraft(field, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  return (
    <ScreenPage background={mobilePageBackground} className="mobile-home-page">
      <div className="mobile-shell">
          <div className="mobile-card-content">
            <div>
            <img src={tanishq30image} alt="tanishq-30" className="tanishq30img"/>
          </div>
          <h1 className="mobile-home-title">
              Write your wishes to Tanishq
          <br />
          for 30 years
          </h1>
          <div className="mobile-form">
              <label className="mobile-field">
                <span className="mobile-field-label">Name :</span>
                <input
                  className="mobile-field-input"
                  type="text"
                  name="guestName"
                  placeholder="Enter your name"
                  value={draft.guestName}
                  onChange={(event) => updateDraft("guestName", event.target.value)}
                />
              </label>

              <label className="mobile-field mobile-field-message">
                <span className="mobile-field-label">Personalised message :</span>
                <textarea
                  className="mobile-field-input mobile-field-textarea"
                  name="message"
                  placeholder="Write your message"
                  rows="3"
                  value={draft.personalizedMessage}
                  onChange={(event) =>
                    updateDraft("personalizedMessage", event.target.value)
                  }
                />
              </label>
            </div>

            <div className="mobile-actions">
              <button
                type="button"
                className="mobile-action-button"
                disabled={!hasRequiredDraftFields}
                onClick={() => navigate("/mobile/photo")}
              >
                Click my photo for Tanishq 30 years
              </button>
              <button
                type="button"
                className="mobile-action-button"
                disabled={!hasRequiredDraftFields}
                onClick={() => navigate("/mobile/video")}
              >
                Record my wish for Tanishq 30 years
              </button>
            </div>
          </div>
      </div>
    </ScreenPage>
  );
}
// function MobileHomePage() {
//   const navigate = useNavigate();
//   const { draft, setDraft } = useSubmissionDraft();
//   const hasRequiredDraftFields =
//     draft.guestName.trim() && draft.personalizedMessage.trim();

//   function updateDraft(field, value) {
//     setDraft((currentDraft) => ({
//       ...currentDraft,
//       [field]: value,
//     }));
//   }

//   return (
//     <ScreenPage background={mobilePageBackground} className="mobile-home-page">
//       <div className="mobile-shell">
       

//         <section className="mobile-card">

//           <h1 className="mobile-home-title">
//               Write my wishes to Tanishq
//           <br />
//           for 30 years
//           </h1>

//           {/* <img
//             className="mobile-card-background"
//             src={mobileContainerBackground}
//             alt=""
//             aria-hidden="true"
//           /> */}

//           <div className="mobile-card-content">
//             <div className="mobile-form">
//               <label className="mobile-field">
//                 <span className="mobile-field-label">Name :</span>
//                 <input
//                   className="mobile-field-input"
//                   type="text"
//                   name="guestName"
//                   placeholder="Enter your name"
//                   value={draft.guestName}
//                   onChange={(event) => updateDraft("guestName", event.target.value)}
//                 />
//               </label>

//               <label className="mobile-field mobile-field-message">
//                 <span className="mobile-field-label">Personalised message :</span>
//                 <textarea
//                   className="mobile-field-input mobile-field-textarea"
//                   name="message"
//                   placeholder="Write your message"
//                   rows="3"
//                   value={draft.personalizedMessage}
//                   onChange={(event) =>
//                     updateDraft("personalizedMessage", event.target.value)
//                   }
//                 />
//               </label>
//             </div>

//             <div className="mobile-actions">
//               <button
//                 type="button"
//                 className="mobile-action-button"
//                 disabled={!hasRequiredDraftFields}
//                 onClick={() => navigate("/mobile/photo")}
//               >
//                 Click my photo for Tanishq 30 years
//               </button>
//               <button
//                 type="button"
//                 className="mobile-action-button"
//                 disabled={!hasRequiredDraftFields}
//                 onClick={() => navigate("/mobile/video")}
//               >
//                 Record my wish for Tanishq 30 years
//               </button>
//             </div>
//           </div>
//         </section>
//       </div>
//     </ScreenPage>
//   );
// }

function MobileVideoPage() {
  const navigate = useNavigate();
  const { draft, setSubmissionId } = useSubmissionDraft();
  const liveVideoRef = useRef(null);
  const livePreviewCanvasRef = useRef(null);
  const playbackVideoRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const captureStreamRef = useRef(null);
  const animationFrameRef = useRef(0);
  const chunksRef = useRef([]);
  const [recordingState, setRecordingState] = useState("idle");
  const [previewMode, setPreviewMode] = useState("idle");
  const [recordedUrl, setRecordedUrl] = useState("");
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    if (recordingState !== "recording") {
      return;
    }

    const interval = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [recordingState]);

  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (captureStreamRef.current) {
        captureStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [recordedUrl]);

  function stopCanvasLoop() {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  }

  function startCanvasLoop() {
    stopCanvasLoop();

    const drawFrame = () => {
      const video = liveVideoRef.current;
      const canvas = livePreviewCanvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        syncCanvasFrame(video, canvas);
      }

      animationFrameRef.current = window.requestAnimationFrame(drawFrame);
    };

    animationFrameRef.current = window.requestAnimationFrame(drawFrame);
  }

  async function ensureStream() {
    if (streamRef.current) {
      return streamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 720 },
        height: { ideal: 1280 },
      },
      audio: true,
    });

    streamRef.current = stream;

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream;
      await liveVideoRef.current.play().catch(() => {});
    }

    startCanvasLoop();

    return stream;
  }

  function getRecordingMimeType() {
    const preferredTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];

    return preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  async function handleRecordClick() {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      return;
    }

    if (recordingState === "recording" && recorderRef.current) {
      recorderRef.current.stop();
      setRecordingState("processing");
      setRecordingSeconds(0);
      return;
    }

    try {
      const stream = await ensureStream();
      const mimeType = getRecordingMimeType();

      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
        setRecordedUrl("");
      }

      setRecordedBlob(null);
      setPreviewMode("live");
      setRecordingSeconds(0);
      chunksRef.current = [];
      const previewCanvas = livePreviewCanvasRef.current;
      const canvasStream = previewCanvas?.captureStream?.(30);

      if (!previewCanvas || !canvasStream) {
        setRecordingState("idle");
        return;
      }

      captureStreamRef.current?.getTracks().forEach((track) => track.stop());

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }

      captureStreamRef.current = canvasStream;

      const recorder = mimeType
        ? new MediaRecorder(canvasStream, { mimeType })
        : new MediaRecorder(canvasStream);

      recorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        const nextUrl = URL.createObjectURL(blob);

        setRecordedBlob(blob);
        setRecordedUrl(nextUrl);
        setPreviewMode("recorded");
        setRecordingState("ready");
        setRecordingSeconds(0);
      });

      recorder.start();
      setRecordingState("recording");
    } catch {
      setRecordingState("idle");
    }
  }

  async function handlePreviewClick() {
    if (!recordedUrl) {
      return;
    }

    setPreviewMode("recorded");

    if (playbackVideoRef.current) {
      playbackVideoRef.current.currentTime = 0;
      await playbackVideoRef.current.play().catch(() => {});
    }
  }

  async function handleSubmitClick() {
    if (!recordedBlob || !recordedUrl || isSubmitting) {
      return;
    }

    const extension = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
    const fileName = `tanishq-video-${Date.now()}.${extension}`;

    setIsSubmitting(true);

    try {
      const dataUrl = await blobToDataUrl(recordedBlob);

      const submission = await submitSubmission({
        name: draft.guestName.trim(),
        landingMessage: draft.personalizedMessage.trim(),
        pageType: "video",
        pagePayload: {
          video: {
            fileName,
            mimeType: recordedBlob.type || "video/webm",
            dataUrl,
          },
        },
      });

      setSubmissionId(submission.submissionId || "");
      navigate("/mobile/consent");
    } catch (error) {
      alert(
        `Submission failed: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenPage background={mobilePageBackground} className="mobile-video-page">
      <div className="mobile-shell">
          <section className="mobile-video-card">
          {recordingState === "recording" && (
            <div className="recording-indicator">
              <span className="recording-indicator-dot" />
              {String(Math.floor(recordingSeconds / 60)).padStart(1, "0")}:{String(
                recordingSeconds % 60
              ).padStart(2, "0")}
            </div>
          )}
          <div className="mobile-video-card-content">
            <div className="mobile-video-preview-shell">
              <video
                ref={liveVideoRef}
                className="mobile-camera-source"
                autoPlay
                muted
                playsInline
                aria-hidden="true"
              />
              <canvas
                ref={livePreviewCanvasRef}
                className={`mobile-video-preview ${previewMode === "recorded" ? "mobile-video-preview-hidden" : ""}`}
              />
              <video
                ref={playbackVideoRef}
                className={`mobile-video-preview ${previewMode === "recorded" ? "" : "mobile-video-preview-hidden"}`}
                src={recordedUrl || undefined}
                controls
                playsInline
              />
              {previewMode === "idle" ? (
                <div className="mobile-video-placeholder">
                  Camera preview will appear here
                </div>
              ) : null}
            </div>
            <img
              className="mobile-video-card-overlay"
              src={mobileVideoFrameOverlay}
              alt=""
              aria-hidden="true"
            />

            <button
              type="button"
              className="mobile-video-record-button"
              onClick={handleRecordClick}
              disabled={isSubmitting}
            >
              {recordingState === "recording" ? "Stop recording" : "Record your video"}
            </button>
          </div>
        </section>

        <div className="mobile-video-footer-actions">
          <button
            type="button"
            className="mobile-video-small-button"
            onClick={handlePreviewClick}
            disabled={isSubmitting}
          >
            Preview
          </button>
          <button
            type="button"
            className="mobile-video-small-button mobile-video-small-button-edit"
            onClick={handleSubmitClick}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Submit"}
          </button>
        </div>
      </div>
    </ScreenPage>
  );
}

function MobilePhotoPage() {
  const navigate = useNavigate();
  const { draft, setSubmissionId } = useSubmissionDraft();
  const liveVideoRef = useRef(null);
  const livePreviewCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(0);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoMode, setPhotoMode] = useState("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [photoUrl]);

  function stopCanvasLoop() {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  }

  function startCanvasLoop() {
    stopCanvasLoop();

    const drawFrame = () => {
      const video = liveVideoRef.current;
      const canvas = livePreviewCanvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        syncCanvasFrame(video, canvas);
      }

      animationFrameRef.current = window.requestAnimationFrame(drawFrame);
    };

    animationFrameRef.current = window.requestAnimationFrame(drawFrame);
  }

  async function ensurePhotoStream() {
    if (streamRef.current) {
      return streamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 720 },
        height: { ideal: 1280 },
      },
      audio: false,
    });

    streamRef.current = stream;

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream;
      await liveVideoRef.current.play().catch(() => {});
    }

    startCanvasLoop();

    return stream;
  }

  function stopPhotoStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }

    stopCanvasLoop();
  }

  async function handlePhotoClick() {
    if (!navigator.mediaDevices?.getUserMedia || isSubmitting) {
      return;
    }

    if (photoMode !== "live") {
      await ensurePhotoStream();
      setPhotoMode("live");
      return;
    }

    if (!liveVideoRef.current) {
      return;
    }

    const previewCanvas = livePreviewCanvasRef.current;

    if (!previewCanvas) {
      return;
    }

    const blob = await new Promise((resolve) => {
      previewCanvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      return;
    }

    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }

    const nextFile = new File([blob], `tanishq-photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    const nextUrl = URL.createObjectURL(nextFile);
    setPhotoFile(nextFile);
    setPhotoUrl(nextUrl);
    setPhotoMode("captured");
    stopPhotoStream();
  }

  async function handlePhotoSubmit() {
    if (!photoFile || !photoUrl || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const dataUrl = await blobToDataUrl(photoFile);

      const submission = await submitSubmission({
        name: draft.guestName.trim(),
        landingMessage: draft.personalizedMessage.trim(),
        pageType: "photo",
        pagePayload: {
          photo: {
            fileName: photoFile.name,
            mimeType: photoFile.type || "image/jpeg",
            dataUrl,
          },
        },
      });

      setSubmissionId(submission.submissionId || "");
      navigate("/mobile/consent");
    } catch (error) {
      alert(
        `Submission failed: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenPage background={mobilePageBackground} className="mobile-photo-page">
      <div className="mobile-shell">
        <section className="mobile-video-card">
          <div className="mobile-video-card-content">
            <div className="mobile-video-preview-shell mobile-photo-preview-shell">
              <video
                ref={liveVideoRef}
                className="mobile-camera-source"
                autoPlay
                muted
                playsInline
                aria-hidden="true"
              />
              <canvas
                ref={livePreviewCanvasRef}
                className={`mobile-video-preview ${photoMode === "live" ? "" : "mobile-video-preview-hidden"}`}
              />
              {photoMode === "captured" && photoUrl ? (
                <img
                  className="mobile-video-preview mobile-photo-preview"
                  src={photoUrl}
                  alt="Captured Tanishq greeting"
                />
              ) : photoMode === "idle" ? (
                <div className="mobile-video-placeholder">
                  Camera photo preview will appear here
                </div>
              ) : null}
            </div>
            <img
              className="mobile-video-card-overlay"
              src={mobileVideoFrameOverlay}
              alt=""
              aria-hidden="true"
            />
            <button
              type="button"
              className="mobile-video-record-button"
              onClick={handlePhotoClick}
              disabled={isSubmitting}
            >
              {photoMode === "live" ? "Capture image" : "Click image"}
            </button>
          </div>
        </section>

        <div className="mobile-video-footer-actions">
          <button
            type="button"
            className="mobile-video-small-button"
            onClick={() => {
              if (photoUrl) {
                setPhotoMode("captured");
              }
            }}
            disabled={isSubmitting}
          >
            Preview
          </button>
          <button
            type="button"
            className="mobile-video-small-button mobile-video-small-button-edit"
            onClick={handlePhotoSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Submit"}
          </button>
        </div>
      </div>
    </ScreenPage>
  );
}

function MobileConsentPage() {
  const navigate = useNavigate();
  const { submissionId, setSubmissionId } = useSubmissionDraft();
  const [isSavingConsent, setIsSavingConsent] = useState(false);

  async function handleConsentChoice(consentStatus) {
    if (!submissionId || isSavingConsent) {
      navigate("/mobile", { replace: true });
      return;
    }

    setIsSavingConsent(true);

    try {
      await updateSubmissionConsent({
        submissionId,
        consentStatus,
      });
      setSubmissionId("");
      navigate("/mobile", { replace: true });
    } catch (error) {
      alert(
        `Consent save failed: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`,
      );
    } finally {
      setIsSavingConsent(false);
    }
  }

  return (
    <ScreenPage background={mobilePageBackground} className="mobile-consent-page">
      <div className="mobile-shell mobile-consent-shell">
            <h1 className="mobile-consent-title">Consent form</h1>

            <div className="mobile-consent-copy">
              <p>
                Thank you for your consent to utilize the testimonial provided
                by you whether as text, video and/or pictorial content featuring
                you and your experience at Tanishq store. We at Titan may use
                the content in its entirety or in parts across any and all
                mediums, platforms and media publishers and tag you on social
                media handles for any posts. Your kind words about our
                product/service mean a great deal to us, and we truly appreciate
                your willingness to share your positive experience.
              </p>
              <p>
                We understand that your time is valuable, and your trust in our
                brand is something we hold in high regard. We greatly appreciate
                your generosity in sharing your experience with our
                products/services and granting us permission to showcase it to a
                wider audience. Your willingness to provide your testimonial
                without any charge further demonstrates your trust and loyalty
                towards our brand, and we are truly humbled by your gesture.
                Your support plays a crucial role in our success, and we are
                grateful for the opportunity to showcase your satisfaction with
                our offerings. Once again, thank you for your generosity in
                permitting us to publish your testimonial on our social media
                platforms. We assure you that we will continue to strive for
                excellence and provide the highest level of satisfaction to all
                our customers.
              </p>
              <p>We really value and cherish your association with us..!</p>
              <p>
                Regards
                <br />
                Tanishq Team
              </p>
            </div>
             
            <div>
              <img src={tanishqlogo} alt="tanishq-logo" className="tanishqlogo"/>
            </div>

            <div className="mobile-consent-actions">
              <button
                type="button"
                className="mobile-consent-button"
                onClick={() => handleConsentChoice("accepted")}
                disabled={isSavingConsent}
              >
                I acknowledge the consent
              </button>
              <button
                type="button"
                className="mobile-consent-button"
                onClick={() => handleConsentChoice("declined")}
                disabled={isSavingConsent}
              >
                Proceed without consent
              </button>
            </div>
      </div>
    </ScreenPage>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/qr" element={<QrPage />} />
      <Route path="/mobile" element={<MobileHomePage />} />
      <Route path="/mobile/photo" element={<MobilePhotoPage />} />
      <Route path="/mobile/video" element={<MobileVideoPage />} />
      <Route path="/mobile/consent" element={<MobileConsentPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SubmissionProvider>
      <AppRoutes />
    </SubmissionProvider>
  );
}
