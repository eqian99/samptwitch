"""
Created 08-04-18 by Matt C. McCallum
"""


# Local imports
from SevenD_search import settings
from SevenD_search import api_7d

# Third party imports
import oauthlib
import oauthlib.oauth1

# Python standard library imports
import urllib.request
import os
import csv
from multiprocessing import pool


def download_sample(trackId, output_dir='/Volumes/Music/OutsideHacks/'):
    """
    Function for downloading tracks.

    Args:
        trackId -> str - ID for the track.

        output_dir -> str - Where to save the file to.
    """
    oauthclient = oauthlib.oauth1.Client(
        settings.API_KEY,
        client_secret=settings.API_SECRET,
        signature_type=oauthlib.oauth1.SIGNATURE_TYPE_QUERY
    )
    
    url = api_7d.build_stream_url(oauthclient, trackId)

    x = urllib.request.urlopen(url).read()
    with open(os.path.join(output_dir, trackId+'.mp3'), 'wb') as f:
        f.write(x)

#
# Code for downloading from the catalog tsv including track IDs.
#
catalog_file = './data/catalog_out.tsv'
trackIds = []
with open(catalog_file, 'r') as f:
    reader = csv.reader(f, delimiter='\t')
    for row in reader:
        trackIds += [(row[4],)]

#
# Do it...
#
pool = pool.Pool(16)
pool.starmap(download_sample, trackIds)
# download_sample('166297')
