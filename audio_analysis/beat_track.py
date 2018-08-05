"""
Created 08-04-18 by Matt C. McCallum
"""


# Local imports
from sigtools import MakeAudioReader
from data_access import dir_funcs

# Third party imports
import librosa.beat as beat
import librosa.filters as filters
import numpy as np
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
import scipy.io

# Python standard library imports
import timeit
import os
import struct
import json
from multiprocessing import pool


def analyze(audio, time):
    """
    """
    # print(time)
    n_fft = int(44100*0.5)
    mel_basis = filters.mel(44100, n_fft, n_mels=256)
    # print(mel_basis.shape)
    start_idx = int(44100*time)#-n_fft/2)
    spec = np.log10(np.abs(np.fft.fft(audio[start_idx:start_idx+n_fft]))**2)
    spec = spec[:int(len(spec)/2)+1]
    # print(spec.shape)
    mel_spec = np.dot(mel_basis, spec)
    norm = np.linalg.norm(mel_spec, ord=2)
    return mel_spec/norm, norm


def track_beats(audio_fname):
    """
    """
    try:
        # Track beats
        audio_file = MakeAudioReader(audio_fname)
        signal = audio_file.ReadSamplesFloat()
        signal = np.sum(signal, axis=0)
        beats = beat.beat_track(signal, sr=44100, units='time')[1]
        beat_intervals = list(zip(beats[:-1], beats[1:]))
        # print(beats[1])

        # Extract features
        analysis = [analyze(signal, beat[0]) for beat in beat_intervals]
        beat_features = [anal[0] for anal in analysis]
        powers = [anal[1] for anal in analysis]
        # print('hey')
        # print(len(beat_features))
        # print(beat_features[0].shape)
        beat_features = np.vstack(beat_features)
        # print(beat_features.shape)

        # Label beats
        pca = PCA(n_components=30)
        reduced_features = pca.fit_transform(beat_features)
        # print(reduced_features.shape)
        labels = KMeans(n_clusters=30, random_state=0).fit(reduced_features).labels_
        # print(labels)

        # Save audio snippets
        # beat_count = 0
        # test_dir = './data/audio'
        # # print(beat_intervals)
        # # print(labels)
        # for beat_interval, label, power in zip(beat_intervals, labels, powers):
        #     start = int(beat_interval[0]*44100)
        #     end = int(beat_interval[1]*44100)
        #     fname = os.path.join(test_dir, str(label)+'_'+str(beat_count)+'.wav')
        #     snippet = signal[start:end]
        #     scipy.io.wavfile.write(fname, 44100, snippet*power/10)
        #     beat_count += 1
        
        track_data = {'beat_times':beats[:-1].tolist(), 'beat_labels':labels.tolist()}
        out_dir = './data/metadata'
        out_file = os.path.splitext(os.path.basename(audio_fname))[0]+'.json'
        out_file = os.path.join(out_dir, out_file)
        with open(out_file, 'w') as f:
            json.dump(track_data, f)

    except Exception:
        print('Failed: ' + os.path.basename(audio_fname))


fnames = dir_funcs.get_filenames('/Volumes/MUSIC/OutsideHacks', ['.mp3'])
fnames = [(fname,) for fname in fnames]
# print(fnames[:1])
# fnames = ['/Volumes/MUSIC/OutsideHacks/85407.mp3']
the_pool = pool.Pool(8)
the_pool.starmap(track_beats, fnames)
# for fname in fnames:
#     try:
#         track_beats(fname)
#     except Exception:
#         print('Failed: ' + os.path.basename(fname))

# track_beats('/Volumes/MUSIC/OutsideHacks/85407.mp3')
# timeit.timeit("track_beats('/Volumes/MUSIC/OutsideHacks/3877.mp3')", setup='from __main__ import track_beats', number=1)