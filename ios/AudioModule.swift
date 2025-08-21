import Foundation
import AVFoundation
import React

@objc(AudioModule)
class AudioModule: NSObject {
  
  private var audioPlayer: AVAudioPlayer?
  private var audioSession: AVAudioSession?
  
  override init() {
    super.init()
    setupAudioSession()
  }
  
  private func setupAudioSession() {
    audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession?.setCategory(.playback, mode: .default)
      try audioSession?.setActive(true)
    } catch {
      print("Failed to setup audio session: \(error)")
    }
  }
  
  @objc
  func playElevenLabsAudio(_ audioData: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let data = Data(base64Encoded: audioData) else {
      rejecter("INVALID_AUDIO", "Invalid audio data", nil)
      return
    }
    
    do {
      audioPlayer = try AVAudioPlayer(data: data)
      audioPlayer?.delegate = self
      audioPlayer?.prepareToPlay()
      audioPlayer?.play()
      
      resolver(true)
    } catch {
      rejecter("PLAYBACK_ERROR", "Failed to play audio: \(error.localizedDescription)", error)
    }
  }
  
  @objc
  func stopAudio(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    audioPlayer?.stop()
    audioPlayer = nil
    resolver(true)
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}

extension AudioModule: AVAudioPlayerDelegate {
  func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    audioPlayer = nil
  }
  
  func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
    print("Audio decode error: \(error?.localizedDescription ?? "Unknown error")")
    audioPlayer = nil
  }
}
