#!/usr/bin/env python3
"""Sign Rev0 with the retained private key. Never generate or upload a key here."""
import argparse, hashlib, json, re, subprocess
from pathlib import Path

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout

def main():
    p=argparse.ArgumentParser()
    for name in ('apk','keystore','password-file','apksigner-jar','aapt','output','policy'):
        p.add_argument('--'+name,required=True,type=Path)
    args=p.parse_args()
    policy=json.loads(args.policy.read_text())
    expected=policy['certificateSha256'].lower()
    # Exporting a certificate does not export the private key.
    cert=subprocess.run(['keytool','-exportcert','-keystore',str(args.keystore),
        '-alias','snakefinance-rev0','-storepass:file',str(args.password_file)],
        check=True,capture_output=True).stdout
    assert hashlib.sha256(cert).hexdigest()==expected,'Signing key does not match retained certificate'
    badging=run([str(args.aapt.resolve()),'dump','badging',str(args.apk)])
    assert "package: name='"+policy['applicationId']+"'" in badging,'Wrong Android package'
    match=re.search(r"versionCode='(\d+)'",badging)
    assert match and int(match[1])>=policy['firstVersionCode'],'Version code is below migration baseline'
    assert 'application-debuggable' not in badging,'Only non-debuggable releases may be delivered'
    args.output.parent.mkdir(parents=True,exist_ok=True)
    run(['java','-jar',str(args.apksigner_jar),'sign','--ks',str(args.keystore),
        '--ks-key-alias','snakefinance-rev0','--ks-pass','file:'+str(args.password_file.resolve()),
        '--v1-signing-enabled','true','--v2-signing-enabled','true',
        '--v3-signing-enabled','true','--v4-signing-enabled','false',
        '--out',str(args.output),str(args.apk)])
    verified=run(['java','-jar',str(args.apksigner_jar),'verify','--verbose','--print-certs',str(args.output)])
    fingerprints=re.findall(r'certificate SHA-256 digest:\s*([0-9a-fA-F]+)',verified)
    assert fingerprints and all(x.lower()==expected for x in fingerprints),'Output certificate mismatch'
    print(json.dumps({'signature':'verified','applicationId':policy['applicationId'],
        'certificateSha256':expected,'versionCode':int(match[1]),
        'apkSha256':hashlib.sha256(args.output.read_bytes()).hexdigest()},indent=2))
if __name__=='__main__':
    main()
