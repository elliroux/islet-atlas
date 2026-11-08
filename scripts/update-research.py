"""Resume bounded fixed-source imports. Default legacy automation is deliberately unchanged."""
import argparse
import getpass
import sys
import json
import time
import urllib.error
import urllib.request

LEGACY = 'https://islet-evidence-atlas.mattepaste.chatgpt.site'
CLOUDFLARE = 'https://isletatlas.org'
SOURCES = {'atlas':1,'recent':10,'publications':50,'trials':20,'fulltext':10}

def update(source,batches,origin,headers,opener=urllib.request.urlopen,sleep=time.sleep):
    saved=0
    for _ in range(batches):
        request=urllib.request.Request(origin+'/api/research',data=json.dumps({'source':source}).encode(),headers=headers,method='POST')
        result=None
        for attempt in range(3):
            try:
                with opener(request,timeout=100) as response:result=json.load(response)
                break
            except (urllib.error.URLError,TimeoutError) as error:
                retryable=not isinstance(error,urllib.error.HTTPError) or error.code in (429,500,502,503,504)
                if not retryable or attempt==2:
                    print(json.dumps({'source':source,'saved':saved,'status':'failed','error':str(error)}),flush=True)
                    return False
                sleep(10*(attempt+1))
        if not isinstance(result,dict) or 'error' in result:
            print(json.dumps({'source':source,'status':'failed','error':'Unexpected import response'}),flush=True);return False
        saved+=result.get('count',0)
        if result.get('complete') or result.get('busy'):break
        sleep(.2)
    print(json.dumps({'source':source,'processed_this_run':saved,'origin':origin,'status':'complete' if result and result.get('complete') else 'bounded run'}),flush=True)
    return True

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin',choices=[LEGACY,CLOUDFLARE],default=LEGACY)
    parser.add_argument('--approved-cloudflare-cutover',action='store_true',help='Use only after migration verification and explicit operator approval')
    parser.add_argument('--service',action='store_true')
    parser.add_argument('--sources',nargs='+',choices=list(SOURCES),default=list(SOURCES))
    parser.add_argument('--max-batches',type=int,default=50)
    args=parser.parse_args()
    if not 1<=args.max_batches<=50:parser.error('--max-batches must be between 1 and 50')
    if args.origin==CLOUDFLARE and not args.approved_cloudflare_cutover:parser.error('Cloudflare cutover requires completed migration verification and --approved-cloudflare-cutover')
    if args.service and args.origin!=LEGACY:parser.error('Legacy service credentials must never be sent to Cloudflare')
    headers={'Content-Type':'application/json','Origin':args.origin,'User-Agent':'IsletAtlasResearchUpdater/1'}
    if args.service:headers['OAI-Sites-Authorization']='Bearer '+getpass.getpass('Site service access (hidden): ')
    success=True
    for name in args.sources:success=update(name,min(args.max_batches,SOURCES[name]),args.origin,headers) and success
    with urllib.request.urlopen(urllib.request.Request(args.origin+'/api/research',headers=headers),timeout=30) as response:print(json.dumps(json.load(response)),flush=True)
    return 0 if success else 1
if __name__=='__main__':sys.exit(main())
