import { BrowserDetection } from '@jitsi/js-utils';
import { getLogger } from 'jitsi-meet-logger';

const logger = getLogger(__filename);

/* Minimum required Chrome / Chromium version. This applies also to derivatives. */
const MIN_REQUIRED_CHROME_VERSION = 72;

// TODO: Move this code to js-utils.

// NOTE: Now we are extending BrowserDetection in order to preserve
// RTCBrowserType interface but maybe it worth exporting BrowserCapabilities
// and BrowserDetection as separate objects in future.

/**
 * Implements browser capabilities for lib-jitsi-meet.
 */
export default class BrowserCapabilities extends BrowserDetection {
    /**
     * Creates new BrowserCapabilities instance.
     */
    constructor() {
        super();
        logger.info(
            `This appears to be ${this.getName()}, ver: ${this.getVersion()}`);
    }

    /**
     * Tells whether or not the <tt>MediaStream/tt> is removed from
     * the <tt>PeerConnection</tt> and disposed on video mute (in order to turn
     * off the camera device).
     * @return {boolean} <tt>true</tt> if the current browser supports this
     * strategy or <tt>false</tt> otherwise.
     */
    doesVideoMuteByStreamRemove() {
        return this.isChromiumBased() || this.isSafari();
    }

    /**
     * Check whether or not the current browser support peer to peer connections
     * @return {boolean} <tt>true</tt> if p2p is supported or <tt>false</tt>
     * otherwise.
     */
    supportsP2P() {
        return !this.usesUnifiedPlan();
    }

    /**
     * Checks if the current browser is Chromium based, that is, it's either
     * Chrome / Chromium or uses it as its engine, but doesn't identify as
     * Chrome.
     *
     * This includes the following browsers:
     * - Chrome and Chromium
     * - Other browsers which use the Chrome engine, but are detected as Chrome,
     *   such as Brave and Vivaldi
     * - Browsers which are NOT Chrome but use it as their engine, and have
     *   custom detection code: Opera, Electron and NW.JS
     */
    isChromiumBased() {
        return this.isChrome()
            || this.isElectron()
            || this.isNWJS()
            || this.isOpera();
    }

    /**
     * Checks whether current running context is a Trusted Web Application.
     *
     * @returns {boolean} Whether the current context is a TWA.
     */
    isTwa() {
        return 'matchMedia' in window && window.matchMedia('(display-mode:standalone)').matches;
    }

    /**
     * Checks if the current browser is supported.
     *
     * @returns {boolean} true if the browser is supported, false otherwise.
     */
    isSupported() {
        return (this.isChromiumBased() && this._getChromiumBasedVersion() >= MIN_REQUIRED_CHROME_VERSION)
            || this.isFirefox()
            || this.isReactNative()
            || (this.isSafari() && !this.isVersionLessThan('12.1'));
    }

    /**
     * Returns whether or not the current environment needs a user interaction
     * with the page before any unmute can occur.
     *
     * @returns {boolean}
     */
    isUserInteractionRequiredForUnmute() {
        return this.isFirefox() && this.isVersionLessThan('68');
    }

    /**
     * Checks if the current browser triggers 'onmute'/'onunmute' events when
     * user's connection is interrupted and the video stops playback.
     * @returns {*|boolean} 'true' if the event is supported or 'false'
     * otherwise.
     */
    supportsVideoMuteOnConnInterrupted() {
        return this.isChromiumBased() || this.isReactNative() || this.isSafari();
    }

    /**
     * Checks if the current browser reports upload and download bandwidth
     * statistics.
     * @return {boolean}
     */
    supportsBandwidthStatistics() {
        // FIXME bandwidth stats are currently not implemented for FF on our
        // side, but not sure if not possible ?
        return !this.isFirefox() && !this.isSafari();
    }

    /**
     * Checks if the current browser supports setting codec preferences on the transceiver.
     * @returns {boolean}
     */
    supportsCodecPreferences() {
        return this.usesUnifiedPlan()
            && window.RTCRtpTransceiver
            && 'setCodecPreferences' in window.RTCRtpTransceiver.prototype
            && window.RTCRtpSender
            && 'getCapabilities' in window.RTCRtpSender.prototype

            // this is not working on Safari because of the following bug
            // https://bugs.webkit.org/show_bug.cgi?id=215567
            && !this.isSafari();
    }

    /**
     * Checks if the current browser support the device change event.
     * @return {boolean}
     */
    supportsDeviceChangeEvent() {
        return navigator.mediaDevices
            && 'ondevicechange' in navigator.mediaDevices
            && 'addEventListener' in navigator.mediaDevices;
    }

    /**
     * Checks if the current browser supports RTT statistics for srflx local
     * candidates through the legacy getStats() API.
     */
    supportsLocalCandidateRttStatistics() {
        return this.isChromiumBased() || this.isReactNative() || this.isSafari();
    }

    /**
     * Checks if the current browser supports the Long Tasks API that lets us observe
     * performance measurement events and be notified of tasks that take longer than
     * 50ms to execute on the main thread.
     */
    supportsPerformanceObserver() {
        return window.PerformanceObserver
            && window.PerformanceObserver.supportedEntryTypes.indexOf('longtask') > -1;
    }

    /**
     * Checks if the current browser supports audio level stats on the receivers.
     */
    supportsReceiverStats() {
        return window.RTCRtpReceiver
            && 'getSynchroniziationSourceS' in window.RTCRtpReceiver.prototype;
    }

    /**
     * Checks if the current browser reports round trip time statistics for
     * the ICE candidate pair.
     * @return {boolean}
     */
    supportsRTTStatistics() {
        // Firefox does not seem to report RTT for ICE candidate pair:
        // eslint-disable-next-line max-len
        // https://www.w3.org/TR/webrtc-stats/#dom-rtcicecandidatepairstats-currentroundtriptime
        // It does report mozRTT for RTP streams, but at the time of this
        // writing it's value does not make sense most of the time
        // (is reported as 1):
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1241066
        // For Chrome and others we rely on 'googRtt'.
        return !this.isFirefox();
    }

    /**
     * Checks if the browser uses plan B.
     *
     * @returns {boolean}
     */
    usesPlanB() {
        return !this.usesUnifiedPlan();
    }

    /**
     * Checks if the browser uses SDP munging for turning on simulcast.
     *
     * @returns {boolean}
     */
    usesSdpMungingForSimulcast() {
        return this.isChromiumBased() || this.isReactNative() || this.isSafari();
    }

    /**
     * Checks if the browser uses unified plan.
     *
     * @returns {boolean}
     */
    usesUnifiedPlan() {
        if (this.isFirefox()) {
            return true;
        }

        if (this.isSafari() && window.RTCRtpTransceiver) {
            // https://trac.webkit.org/changeset/236144/webkit/trunk/LayoutTests/webrtc/video-addLegacyTransceiver.html
            return 'currentDirection' in window.RTCRtpTransceiver.prototype;
        }

        return false;
    }

    /**
     * Returns whether or not the current browser should be using the new
     * getUserMedia flow, which utilizes the adapter shim. This method should
     * be temporary and used while migrating all browsers to use adapter and
     * the new getUserMedia.
     *
     * @returns {boolean}
     */
    usesNewGumFlow() {
        if (this.isChromiumBased() || this.isFirefox() || this.isSafari()) {
            return true;
        }

        return false;
    }

    /**
     * Checks if the browser uses webrtc-adapter. All browsers using the new
     * getUserMedia flow.
     *
     * @returns {boolean}
     */
    usesAdapter() {
        return this.usesNewGumFlow();
    }

    /**
     * Checks if the browser uses RIDs/MIDs for siganling the simulcast streams
     * to the bridge instead of the ssrcs.
     */
    usesRidsForSimulcast() {
        return false;
    }

    /**
     * Checks if the browser supports getDisplayMedia.
     * @returns {boolean} {@code true} if the browser supports getDisplayMedia.
     */
    supportsGetDisplayMedia() {
        return (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices)
            || ('getDisplayMedia' in navigator);
    }

    /**
     * Checks if the browser supports insertable streams, needed for E2EE.
     * @returns {boolean} {@code true} if the browser supports insertable streams.
     */
    supportsInsertableStreams() {
        if (!(window.RTCRtpSender
            && ('createEncodedStreams' in window.RTCRtpSender.prototype
                || 'createEncodedVideoStreams' in window.RTCRtpSender.prototype))) {
            return false;
        }

        // Feature-detect transferable streams which we need to operate in a worker.
        // See https://groups.google.com/a/chromium.org/g/blink-dev/c/1LStSgBt6AM/m/hj0odB8pCAAJ
        const stream = new ReadableStream();

        try {
            window.postMessage(stream, '*', [ stream ]);

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Whether the browser supports the RED format for audio.
     */
    supportsAudioRed() {
        return Boolean(window.RTCRtpSender
            && window.RTCRtpSender.getCapabilities
            && window.RTCRtpSender.getCapabilities('audio').codecs.some(codec => codec.mimeType === 'audio/red')
            && window.RTCRtpReceiver
            && window.RTCRtpReceiver.getCapabilities
            && window.RTCRtpReceiver.getCapabilities('audio').codecs.some(codec => codec.mimeType === 'audio/red'));
    }

    /**
     * Checks if the browser supports the "sdpSemantics" configuration option.
     * https://webrtc.org/web-apis/chrome/unified-plan/
     *
     * @returns {boolean}
     */
    supportsSdpSemantics() {
        return this.isChromiumBased();
    }

    /**
     * Returns the version of a Chromium based browser.
     *
     * @returns {Number}
     */
    _getChromiumBasedVersion() {
        if (this.isChromiumBased()) {
            // NW.JS doesn't expose the Chrome version in the UA string.
            if (this.isNWJS()) {
                // eslint-disable-next-line no-undef
                return Number.parseInt(process.versions.chromium, 10);
            }

            // Here we process all browsers which use the Chrome engine but
            // don't necessarily identify as Chrome. We cannot use the version
            // comparing functions because the Electron, Opera and NW.JS
            // versions are inconsequential here, as we need to know the actual
            // Chrome engine version.
            const ua = navigator.userAgent;

            if (ua.match(/Chrome/)) {
                const version
                    = Number.parseInt(ua.match(/Chrome\/([\d.]+)/)[1], 10);

                return version;
            }
        }

        return -1;
    }
}
