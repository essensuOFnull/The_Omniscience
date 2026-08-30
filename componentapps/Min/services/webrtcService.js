import portholeService from './portholeService';

class WebRTCService {
  constructor() {
    this.peerConnections = {}; // remotePeerId -> RTCPeerConnection
    this.localStream = null;
    this.remoteStreams = {};
    this.onRemoteStream = null; // колбэк для передачи потока в UI
    this.onLocalStream = null;
    this.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  }

  async startCamera() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (this.onLocalStream) this.onLocalStream(this.localStream);
    return this.localStream;
  }

  async startScreenShare() {
    this.localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    if (this.onLocalStream) this.onLocalStream(this.localStream);
    return this.localStream;
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  async createPeerConnection(remotePeerId) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peerConnections[remotePeerId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        portholeService.sendSignal(remotePeerId, { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      this.remoteStreams[remotePeerId] = event.streams[0];
      if (this.onRemoteStream) this.onRemoteStream(remotePeerId, event.streams[0]);
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    }
    return pc;
  }

  async call(remotePeerId) {
    const pc = await this.createPeerConnection(remotePeerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    portholeService.sendSignal(remotePeerId, { sdp: pc.localDescription });
  }

  async acceptCall(remotePeerId, sdp) {
    const pc = await this.createPeerConnection(remotePeerId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    portholeService.sendSignal(remotePeerId, { sdp: pc.localDescription });
  }

  handleSignal(remotePeerId, data) {
    const pc = this.peerConnections[remotePeerId];
    if (!pc) return;
    if (data.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    } else if (data.candidate) {
      pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }

  closeConnection(remotePeerId) {
    if (this.peerConnections[remotePeerId]) {
      this.peerConnections[remotePeerId].close();
      delete this.peerConnections[remotePeerId];
      delete this.remoteStreams[remotePeerId];
    }
  }

  closeAll() {
    Object.keys(this.peerConnections).forEach(id => this.closeConnection(id));
    this.stopLocalStream();
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;