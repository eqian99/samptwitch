"""
Created 08-05-18 by Matt C. McCallum
"""


# Local imports
from SevenD_search import settings
from SevenD_search import api_7d

# Third party imports
from flask import Flask
from flask import jsonify
from flask_cors import CORS
import oauthlib
import oauthlib.oauth1
import numpy as np

# Python standard library imports
import json
import os


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, send_wildcard=True)

METADATA_DIR = './data/groomed_metadata'
LIBRARY_FILE = './data/trackdata.json'


@app.route('/trackinfo/<trackid>')
def trackinfo(trackid):
    """
    """
    # Get data from json file
    with open(os.path.join(METADATA_DIR, trackid+'.json'), 'r') as f:
        the_data = json.load(f)

    # Create the URL
    oauthclient = oauthlib.oauth1.Client(
        settings.API_KEY,
        client_secret=settings.API_SECRET,
        signature_type=oauthlib.oauth1.SIGNATURE_TYPE_QUERY
    )
    url = api_7d.build_stream_url(oauthclient, trackid)

    the_data['url'] = url
    beatlengths = np.array(the_data['beat_times'][1:]) - np.array(the_data['beat_times'][:-1])
    beatlengths = sorted(beatlengths.tolist())
    the_data['bpm'] = 60.0/beatlengths[len(beatlengths)//2]

    return jsonify(the_data)

@app.route('/getlibrary')
def getlibrary():
    """
    """
    with open(LIBRARY_FILE, 'r') as f:
        trackdata = json.load(f)

    return jsonify(trackdata)


if __name__=='__main__':
    app.run(host='0.0.0.0', ssl_context=('./server.crt', './server.key'))