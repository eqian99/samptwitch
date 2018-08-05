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


def download_sample(trackId, output_dir='/Volumes/MUSIC/OutsideHacks/'):
    """
    Function for downloading tracks.

    Args:
        trackId -> str - ID for the track.

        output_dir -> str - Where to save the file to.
    """
    output_loc = os.path.join(output_dir, trackId+'.mp3')
    if not os.path.isfile(output_loc):
        try:
            oauthclient = oauthlib.oauth1.Client(
                settings.API_KEY,
                client_secret=settings.API_SECRET,
                signature_type=oauthlib.oauth1.SIGNATURE_TYPE_QUERY
            )
            
            url = api_7d.build_stream_url(oauthclient, trackId)

            # print(url)
            x = urllib.request.urlopen(url).read()
            # print("Got it: " + output_loc)
            with open(output_loc, 'wb') as f:
                f.write(x)
                # print("Wrote it")
        except Exception:
            print("Failed " + trackId)

    return None

#
# Code for downloading from the catalog tsv including track IDs.
#
catalog_file = './data/catalog_out.tsv'
trackIds = []
with open(catalog_file, 'r') as f:
    reader = csv.reader(f, delimiter='\t')
    next(reader)
    for row in reader:
        trackIds += [(row[4],)]
        if type(trackIds[-1][0]) is not str:
            print("WAMP WOW")

#
# Do it...
#
for tid in trackIds:
    download_sample(tid[0])
pool = pool.Pool(8)
pool.starmap(download_sample, trackIds)
# download_sample('166297')
