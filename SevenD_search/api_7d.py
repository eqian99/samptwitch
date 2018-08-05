from . import settings
import oauthlib
import oauthlib.oauth1
import requests
import xmltodict


def artist_releases(artist_id):
    url = settings.URL_ARTIST_RELEASES
    releases_ret = []
    page = 1
    total_results_processed = 0
    total_items = 1
    titles_for_dedupe = {}
    while total_results_processed < total_items:
        params = {
            'shopId': settings.SHOP_ID,
            'oauth_consumer_key': settings.API_KEY,
            'artistId': artist_id,
            'usageTypes': 'adsupportedstreaming',
            'pagesize': 50,
            'page': page
        }
        r = requests.get(url, params=params)
        if r.status_code != 200:
            raise Exception('Artist release returned %d!' % r.status_code)
        page += 1

        # print(r.text)
        doc = xmltodict.parse(r.text)
        response = doc['response']
        status = response['@status']
        if status.lower() == 'error':
            errorcode = response['error']['@code']
            errormsg = response['error']['errorMessage']
            raise Exception('Error from api: %s (%s)' % (errormsg, errorcode))

        releases = response['releases']
        total_items = int(releases['totalItems'])
        if total_items == 0:
            break

        list_releases = releases['release']
        if type(list_releases) == list:
            for r in list_releases:
                total_results_processed += 1
                release_id = r['@id']
                release_name = r['title']
                version = r['version']
                year = r['year']
                if release_name in titles_for_dedupe:
                    continue
                titles_for_dedupe[release_name] = True
                releases_ret.append((release_id, release_name, version, year))
        else:
            r = list_releases
            total_results_processed += 1
            release_id = r['@id']
            release_name = r['title']
            version = r['version']
            year = r['year']
            if release_name in titles_for_dedupe:
                continue
            titles_for_dedupe[release_name] = True
            releases_ret.append((release_id, release_name, version, year))

    return releases_ret


def browse_artists(input_text):
    url = settings.URL_ARTIST_BROWSE
    artists_ret = []
    page = 1
    total_results_processed = 0
    total_items = 1
    while total_results_processed < total_items:
        params = {
            'shopId': settings.SHOP_ID,
            'oauth_consumer_key': settings.API_KEY,
            'letter': input_text,
            'pagesize': 50,
            'page': page
        }
        r = requests.get(url, params=params)
        if r.status_code != 200:
            raise Exception('Artist browse returned %d!' % r.status_code)
        page += 1

        # print(r.text)
        doc = xmltodict.parse(r.text)
        response = doc['response']
        status = response['@status']
        if status.lower() == 'error':
            errorcode = response['error']['@code']
            errormsg = response['error']['errorMessage']
            raise Exception('Error from api: %s (%s)' % (errormsg, errorcode))

        artists = response['artists']
        total_items = int(artists['totalItems'])
        if total_items == 0:
            break

        list_artists = artists['artist']
        if type(list_artists) == list:
            for r in list_artists:
                total_results_processed += 1
                artist_id = r['@id']
                artist_name = r['name']
                artists_ret.append((artist_id, artist_name))
        else:
            r = list_artists
            total_results_processed += 1
            artist_id = r['@id']
            artist_name = r['name']
            artists_ret.append((artist_id, artist_name))

    return artists_ret


def search_artists(input_text):
    url = settings.URL_ARTIST_SEARCH
    artists = []
    page = 1
    total_results_processed = 0
    total_items = 1
    while total_results_processed < total_items:
        params = {
            'shopId': settings.SHOP_ID,
            'oauth_consumer_key': settings.API_KEY,
            'q': input_text,
            'pagesize': 50,
            'page': page
        }
        r = requests.get(url, params=params)
        if r.status_code != 200:
            raise Exception('Artist search returned %d!' % r.status_code)

        page += 1

        # print(r.text)
        doc = xmltodict.parse(r.text)
        response = doc['response']
        status = response['@status']
        if status.lower() == 'error':
            errorcode = response['error']['@code']
            errormsg = response['error']['errorMessage']
            raise Exception('Error from api: %s (%s)' % (errormsg, errorcode))

        results = response['searchResults']
        total_items = int(results['totalItems'])
        if total_items == 0:
            break

        list_results = results['searchResult']
        if type(list_results) == list:
            for r in list_results:
                total_results_processed += 1
                artist_id = r['artist']['@id']
                artist_name = r['artist']['name']
                artists.append((artist_id, artist_name))
        else:
            r = list_results
            total_results_processed += 1
            artist_id = r['artist']['@id']
            artist_name = r['artist']['name']
            artists.append((artist_id, artist_name))

    return artists


def release_tracks(release_id):
    url = settings.URL_RELEASE_TRACKS
    tracks_ret = []
    page = 1
    total_results_processed = 0
    total_items = 1
    oauthclient = oauthlib.oauth1.Client(
        settings.API_KEY,
        client_secret=settings.API_SECRET,
        signature_type=oauthlib.oauth1.SIGNATURE_TYPE_QUERY
    )

    while total_results_processed < total_items:
        params = {
            'shopId': settings.SHOP_ID,
            'oauth_consumer_key': settings.API_KEY,
            'releaseId': release_id,
            'usageTypes': 'adsupportedstreaming',
            'pagesize': 50,
            'page': page
        }
        r = requests.get(url, params=params)
        if r.status_code != 200:
            raise Exception('Release tracks returned %d!' % r.status_code)
        page += 1

        # print(r.text)
        doc = xmltodict.parse(r.text)
        response = doc['response']
        status = response['@status']
        if status.lower() == 'error':
            errorcode = response['error']['@code']
            errormsg = response['error']['errorMessage']
            raise Exception('Error from api: %s (%s)' % (errormsg, errorcode))

        tracks = response['tracks']
        total_items = int(tracks['totalItems'])
        if total_items == 0:
            break

        list_tracks = tracks['track']
        if type(list_tracks) == list:
            for r in list_tracks:
                total_results_processed += 1
                track_id = r['@id']
                track_name = r['title']
                stream_url = build_stream_url(oauthclient, track_id)
                tracks_ret.append((track_id, track_name, stream_url))
        else:
            r = list_tracks
            total_results_processed += 1
            track_id = r['@id']
            track_name = r['title']
            stream_url = build_stream_url(oauthclient, track_id)
            tracks_ret.append((track_id, track_name, stream_url))

    return tracks_ret


def build_stream_url(oauthclient, track_id):
    url = settings.URL_AUDIO
    url += '?shopId=%s' % settings.SHOP_ID
    url += '&trackId=%s' % track_id

    uri, headers, body = oauthclient.sign(url)

    return uri
