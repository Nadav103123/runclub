"""Builds data/chayei-sarah.js from Sefaria's public-domain Tanach texts.

Usage: python3 -I tools/build_data.py <taamim.json> <nikud.json> <text.json>
Source: Sefaria-Export (Tanach with Ta'amei Hamikra / Nikkud / Text Only), Public Domain.
"""
import json, re, sys

TAAMIM = {
    '֑': 'אתנחתא', '֒': 'סגול', '֓': 'שלשלת', '֔': 'זקף קטן',
    '֕': 'זקף גדול', '֖': 'טיפחא', '֗': 'רביע', '֘': 'זרקא',
    '֙': 'פשטא', '֚': 'יתיב', '֛': 'תביר', '֜': 'גרש',
    '֝': 'גרש', '֞': 'גרשיים', '֟': 'קרני פרה', '֠': 'תלישא גדולה',
    '֡': 'פזר', '֣': 'מונח', '֤': 'מהפך', '֥': 'מרכא',
    '֦': 'מרכא כפולה', '֧': 'דרגא', '֨': 'קדמא', '֩': 'תלישא קטנה',
    '֪': 'ירח בן יומו',
}
SILLUK = 'ֽ'

def parse_range(chapters, c1, v1, c2, v2):
    out = []
    for c in range(c1, c2 + 1):
        start = v1 if c == c1 else 1
        end = v2 if c == c2 else len(chapters[c - 1])
        for v in range(start, end + 1):
            out.append((c, v))
    return out

def words_of(verse_tm, verse_nk, verse_tx):
    def split(s):
        s = re.sub(r'\([ספ]\)', '', s)  # parasha-break markers (ס)/(פ)
        s = s.replace('׃', '').replace('׀', ' ').strip()
        # keep maqaf attached to the preceding part, split on spaces
        parts = []
        for tok in s.split():
            pieces = re.findall(r'[^־]+־?', tok)
            parts.extend(pieces)
        return parts
    tm, nk, tx = split(verse_tm), split(verse_nk), split(verse_tx)
    assert len(tm) == len(nk) == len(tx), (verse_tm, len(tm), len(nk), len(tx))
    words = []
    for i, (a, b, c) in enumerate(zip(tm, nk, tx)):
        marks = [ch for ch in a if ch in TAAMIM]
        last = i == len(tm) - 1
        if last and SILLUK in a:
            trope = 'סוף פסוק'
        elif marks:
            trope = TAAMIM[marks[0]]
        else:
            trope = ''
        stress = next((j for j, ch in enumerate(a) if ch in TAAMIM or (last and ch == SILLUK)), -1)
        # vowels before the stress mark => stressed syllable index
        vowels = lambda s: len(re.findall(r'[ֱ-ׇֻ]', s))
        before = vowels(a[:stress]) if stress >= 0 else 0
        words.append({'t': a, 'n': b, 'b': c, 'tr': trope,
                      'syl': max(1, vowels(a)), 'st': max(0, before - 1) if stress >= 0 else 0})
    return words

def main():
    tm = json.load(open(sys.argv[1]))['text']
    nk = json.load(open(sys.argv[2]))['text']
    tx = json.load(open(sys.argv[3]))['text']
    verses = []
    for c, v in parse_range(tm, 23, 1, 25, 18):
        verses.append({'c': c, 'v': v, 'w': words_of(tm[c-1][v-1], nk[c-1][v-1], tx[c-1][v-1])})
    js = 'window.CHAYEI_SARAH = ' + json.dumps(verses, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open('data/chayei-sarah.js', 'w', encoding='utf-8').write(js)
    print(len(verses), 'verses,', sum(len(x['w']) for x in verses), 'words')

main()
