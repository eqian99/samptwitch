"""
Created 08-05-18 by Matt C. McCallum
"""


# Local imports
from data_access import dir_funcs

# Third party imports
# None.

# Python standard library imports
import os
import json
import csv


MEATADATA_DIR = './data/metadata'

valid_tracks = dir_funcs.get_filenames(MEATADATA_DIR, ['.json'])
valid_tracks = [os.path.splitext(os.path.basename(trk))[0] for trk in valid_tracks]

catalog_file = './data/catalog_out.tsv'
trackdata = []
with open(catalog_file, 'r') as f:
    reader = csv.reader(f, delimiter='\t')
    next(reader)
    for row in reader:
        if row[4] in valid_tracks:
            trackdata += [{'trackid':row[4],'artist':row[1],'title':row[5]}]

print(len(trackdata))
with open('./trackdata.json', 'w') as f:
    json.dump(trackdata, f)
