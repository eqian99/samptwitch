import settings
import api_7d

FILEOUT = 'catalog_out.tsv'


def main():
    alphabet = 'abcdefghijklmnopqrstuvwxyz'
    with open(FILEOUT, 'w', encoding='utf-8') as f:
        f.write('ARTIST_ID\tARTIST_NAME\tALBUM_ID\tALBUM_NAME\tTRACK_ID\tTRACK_NAME\tURL\n')
        for letter in alphabet:
            print('Scraping artists with letter %s...' % letter)
            artists = api_7d.browse_artists(letter)
            for artist in artists:
                releases = api_7d.artist_releases(artist[0])
                if len(releases) > 0:
                    print('Dumping tracks for artist: %s (%s)' % (artist[1], artist[0]))
                    for release in releases:
                        tracks = api_7d.release_tracks(release[0])

                        for t in tracks:
                            f.write('%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (
                                artist[0],
                                artist[1],
                                release[0],
                                release[1],
                                t[0],
                                t[1],
                                t[2]
                            ))


if __name__ == '__main__':
    main()
