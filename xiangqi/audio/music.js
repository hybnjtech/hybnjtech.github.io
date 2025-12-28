(function (global) {
  "use strict";

  var Xiangqi = (global.Xiangqi = global.Xiangqi || {});
  var AudioContextClass = global.AudioContext || global.webkitAudioContext;

  function MusicEngine() {
    this.ctx = null;
    this.masterGain = null;
    this.isPlayingFlag = false;
    this.scheduler = null;
    this.nextNoteTime = 0;
    this.sequenceIndex = 0;
    this.tempo = 72;
    this.scheduleAheadTime = 1.2;
    this.baseFrequency = 196;
    this.volume = 0.35;
    this.sequence = [
      { offset: 0, beats: 1 },
      { offset: 2, beats: 1 },
      { offset: 4, beats: 1 },
      { offset: 7, beats: 2 },
      { offset: 9, beats: 1 },
      { offset: 7, beats: 1 },
      { offset: 4, beats: 1 },
      { offset: 2, beats: 1 },
      { offset: 0, beats: 2 },
      { offset: null, beats: 1 },
      { offset: 2, beats: 1 },
      { offset: 4, beats: 1 },
      { offset: 9, beats: 2 },
      { offset: 7, beats: 1 },
      { offset: 4, beats: 1 },
      { offset: 2, beats: 1 },
      { offset: 0, beats: 2 },
    ];
  }

  MusicEngine.prototype.isSupported = function () {
    return !!AudioContextClass;
  };

  MusicEngine.prototype.ensureContext = function () {
    if (!this.ctx && AudioContextClass) {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
  };

  MusicEngine.prototype.scheduleTone = function (time, freq, duration, intensity) {
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    var filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 6;

    filter.type = "lowpass";
    filter.frequency.value = 1400;

    var attack = 0.02;
    var decay = 0.12;
    var sustain = intensity * 0.6;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(intensity, time + attack);
    gain.gain.linearRampToValueAtTime(sustain, time + attack + decay);
    gain.gain.linearRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  };

  MusicEngine.prototype.schedule = function () {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      var note = this.sequence[this.sequenceIndex];
      var beatDuration = 60 / this.tempo;
      var duration = note.beats * beatDuration;
      if (note.offset !== null) {
        var freq = this.baseFrequency * Math.pow(2, note.offset / 12);
        this.scheduleTone(this.nextNoteTime, freq, duration, 0.2);
      }
      this.nextNoteTime += duration;
      this.sequenceIndex = (this.sequenceIndex + 1) % this.sequence.length;
    }
  };

  MusicEngine.prototype.start = function () {
    if (!this.isSupported()) {
      return false;
    }
    this.ensureContext();
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    if (this.isPlayingFlag) {
      return true;
    }
    this.isPlayingFlag = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.sequenceIndex = 0;
    var self = this;
    this.scheduler = setInterval(function () {
      if (!self.isPlayingFlag) {
        return;
      }
      self.schedule();
    }, 120);
    return true;
  };

  MusicEngine.prototype.stop = function () {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
    this.isPlayingFlag = false;
  };

  MusicEngine.prototype.toggle = function () {
    if (this.isPlayingFlag) {
      this.stop();
      return true;
    }
    return this.start();
  };

  MusicEngine.prototype.setVolume = function (value) {
    this.volume = value;
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  };

  MusicEngine.prototype.isPlaying = function () {
    return this.isPlayingFlag;
  };

  Xiangqi.Music = new MusicEngine();
})(window);
