/* Exact selected Phase 3 Arcade Assault composition and analytical synthesis.
 * Extracted from phase-3-review/music/candidates.js, not recomposed or remastered.
 * A-only source supports file:// without fetch, recordings, or external services.
 * Original source SHA256: e90c107d01e1c2ace52892e5e216f7603d68b697f837ce0c774336add51f238d
 * Approved WAV SHA256: aa219d3a25dc237d9d7d2d53421ddcf9ed10c3bf2a670da4e0bd0b5ca945b69d
 * verify-approved-audio.mjs proves every Float32 sample matches the approved
 * renderer at 44.1/48 kHz and its exported 48 kHz PCM16 WAV quantization. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, BARS = 8, BEATS = BARS * 4;
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);
  const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze); Object.freeze(value);
    }
    return value;
  };
  const METADATA = freeze({ id: 'a', letter: 'A', title: 'Arcade Assault', tempo: 140, key: 'D minor', bars: BARS, beats: BEATS,
    duration: BEATS * 60 / 140, character: 'Fast, tight, urgent',
    harmony: ['Dm', 'B♭', 'F', 'C', 'Dm', 'Gm', 'B♭', 'A'],
    motif: [62,69,65,74,72,69,70,65,67,64,61,62],
    motifBeats: [.5,1.25,2,3.25,6.5,7.25,10.5,13.5,18.25,22.5,28.5,30.25],
    instrumentation: ['rounded pulse bass', 'short minor-key lead', 'sixteenth-note synth sequence', 'synth kick and snare', 'restrained noise hats'],
    rhythm: 'Four-on-the-floor kick, backbeat snare, rapid alternating bass and synth accents.',
    melodicApproach: 'Twelve short angular notes; an upward leap answers a descending phrase, then a leading tone resolves the loop.',
    builder: 'composeA', seed: 0x41535341 });

  function render(sampleRate = 48000) {
    const metadata = METADATA, id = metadata.id;
    if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Invalid sample rate');
    const length = Math.round(metadata.duration * sampleRate), duration = length / sampleRate;
    // Identical integer-sample loop and effective beat to the approved source.
    const beat = duration / BEATS;
    const channels = [new Float32Array(length), new Float32Array(length)];
    let seed = metadata.seed;
    const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
    const events = [];
    function note(at, beats, midi, voice, gain, pan = 0) { events.push({ at: at * beat, seconds: beats * beat, midi, voice, gain, pan }); }
    const percussion = (at, voice, gain, pan = 0) => note(at, voice === 'kick' ? .52 : voice === 'snare' ? .38 : voice === 'metal' ? .28 : .16, null, voice, gain, pan);
    composeA({ note, percussion });

    for (const event of events) {
      const first = Math.round(event.at * sampleRate), count = Math.ceil(event.seconds * sampleRate);
      const frequency = event.midi == null ? 0 : hz(event.midi);
      const l = Math.sqrt((1-event.pan)/2), r = Math.sqrt((1+event.pan)/2);
      let previousNoise = 0;
      for (let i = 0; i < count; i++) {
        const t = i / sampleRate, phase = TAU * frequency * t;
        const edge = Math.min(1, t/.004) * Math.min(1, (event.seconds-t)/.018);
        let signal;
        if (event.voice === 'bassA') signal = (Math.sin(phase)+.26*Math.sin(3*phase)+.07*Math.sin(5*phase))*edge*Math.exp(-t*5.5);
        else if (event.voice === 'sub') signal = Math.sin(phase)*Math.min(1,t/.012)*Math.min(1,(event.seconds-t)/.05)*Math.exp(-t*1.9);
        else if (event.voice === 'arpA') signal = (Math.sin(phase)+.22*Math.sin(2*phase)+.08*Math.sin(3*phase))*edge*Math.exp(-t*14);
        else if (event.voice === 'leadA') signal = (Math.sin(phase)+.18*Math.sin(3*phase))*edge*Math.exp(-t*6);
        else if (event.voice === 'kick') {
          const sweep = TAU*(45*t+100*(1-Math.exp(-t*32))/32);
          signal = (Math.sin(sweep)*Math.exp(-t*23)+noise()*.035*Math.exp(-t*160))*edge;
        } else {
          const current = noise(), high = (current-previousNoise)*.5; previousNoise = current;
          if (event.voice === 'snare') signal = (high*Math.exp(-t*33)+.40*Math.sin(TAU*170*t)*Math.exp(-t*40))*edge;
          else if (event.voice === 'metal') signal = (Math.sin(TAU*205*t)+.44*Math.sin(TAU*312*t)+.16*Math.sin(TAU*483*t))*edge*Math.exp(-t*33);
          else if (event.voice === 'tom') signal = Math.sin(TAU*(75*t+45*(1-Math.exp(-t*24))/24))*edge*Math.exp(-t*25);
          else signal = high*edge*Math.exp(-t*80);
        }
        const index = ((first+i)%length+length)%length;
        channels[0][index] += signal*event.gain*l;
        channels[1][index] += signal*event.gain*r;
      }
    }
    let peak = 0, energy = 0;
    for (const channel of channels) for (const value of channel) { peak=Math.max(peak,Math.abs(value)); energy+=value*value; }
    const rms = Math.sqrt(energy/(length*2)), scale = peak ? Math.min(.76/peak, .18/rms) : 1;
    for (const channel of channels) for (let i=0;i<length;i++) channel[i]*=scale;
    return { id, sampleRate, length, duration, channels, metadata,
      stats: { peak: peak*scale, rms: rms*scale, boundary: channels.map(channel=>Math.abs(channel[0]-channel[length-1])), eventCount: events.length } };
  }

  function composeA({ note, percussion }) {
    const roots = [38,34,41,36,38,31,34,33];
    const chords = [[50,53,57,62],[46,50,53,58],[53,57,60,65],[48,52,55,60],[50,53,57,62],[43,46,50,55],[46,50,53,58],[45,49,52,57]];
    for (let bar=0;bar<BARS;bar++) {
      const at=bar*4, root=roots[bar];
      for (let step=0;step<16;step++) {
        const bass=[root,root+12,root,root+7][step%4];
        note(at+step/4,.20,bass,'bassA',step%4===0?.28:.15);
        note(at+step/4+.125,.30,chords[bar][step%4],'arpA',step%2?.036:.055,step%2?.24:-.24);
      }
      for (let pulse=0;pulse<4;pulse++) {
        percussion(at+pulse,'kick',.31); note(at+pulse+.05,.74,root-12,'sub',.13);
        if (pulse%2) percussion(at+pulse,'snare',.12);
        percussion(at+pulse+.5,'hat',.027,.22);
      }
      if (bar===3||bar===7) { percussion(at+3.5,'tom',.095,-.22); percussion(at+3.75,'metal',.045,.22); }
    }
    const motif=METADATA;
    motif.motif.forEach((midi,index)=>{
      note(motif.motifBeats[index],index%3===0?.58:.38,midi,'leadA',.10);
      note(motif.motifBeats[index]+.75,.44,midi,'leadA',.021,.38);
    });
  }

  function createBuffer(context) {
    const rendered=render(context.sampleRate),buffer=context.createBuffer(2,rendered.length,rendered.sampleRate);
    rendered.channels.forEach((channel,index)=>buffer.getChannelData(index).set(channel));
    return { buffer, stats:rendered.stats, metadata:rendered.metadata };
  }
  const api = Object.freeze({ METADATA, render, createBuffer });
  root.ArcadeAssaultMusic = api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
