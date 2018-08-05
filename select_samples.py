"""
Created 08-05-18 by Matt C. McCallum
"""


# Local imports
from data_access import dir_funcs

# Third party imports
import numpy

# Python standard library imports
import os
import json
import random


# Read in all json files
MEATADATA_DIR = './data/metadata'
OUTPUT_DIR = './data/groomed_metadata'
valid_tracks = dir_funcs.get_filenames(MEATADATA_DIR, ['.json'])

for trk in valid_tracks:
    # Select samples
    with open(trk, 'r') as f:
        trkdata = json.load(f)
    selected_samples = []
    for lab in range(30):
        idcs = [idx for idx, lbl in enumerate(trkdata['beat_labels']) if lbl==lab]
        selected_samples += [random.choice(idcs)]
    trkdata['beat_selections'] = selected_samples

    # Save to new json file
    out_file = os.path.join(OUTPUT_DIR, os.path.basename(trk))
    with open(out_file, 'w') as f:
        json.dump(trkdata, f)
        