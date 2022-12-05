import boto3
import json
# from botocore.vendored import requests
# import urllib3
import uuid
s3  = boto3.client('s3')
transcribe = boto3.client('transcribe')

def lambda_handler(event, context):
    try:
        file_bucket = event['Records'][0]['s3']['bucket']['name']
        file_name = event['Records'][0]['s3']['object']['key']

        # file_name = '2022-09-22_045534_33.45816931879978_-112.0661277764694_clip_0.mp3'
        if '_clip' in file_name:
            # http = urllib3.PoolManager()
            object_url = 'https://s3.amazonaws.com/{0}/{1}'.format(file_bucket, file_name)
            # object_url = 'https://s3.amazonaws.com/livecapture-420/2022-09-22_045534_33.45816931879978_-112.0661277764694_clip_0.mp3'
            uid = str(uuid.uuid4()).split("-")[0]
            transcriptionJobDetails=startTranscriptionJob(uid, object_url, file_name)
            status = getTranscriptionJob(uid)
            # url=status['TranscriptionJob']['Transcript']['TranscriptFileUri']
            # dataResult = http.request("GET", url)
            # data = dataResult.data
            # if type(data) == "<class 'str'>":
                # data = json.loads(data)
            # Text_Data = data['results']['transcripts'][0]['transcript']
            # file = open(f"/tmp/{file_name}.txt", "w")
            # file.write(Text_Data)
            # file.close()
            # s3.upload_file(
            #                 Filename = f"/tmp/{file_name}.txt" ,
            #                 Bucket = "test-bucket-transcribe" ,
            #                 Key = f"{file_name}.txt"
            #                 )
            return True
    except Exception as e:
        raise e


def startTranscriptionJob(uid,object_url,file_name):
    response = transcribe.start_transcription_job(
        TranscriptionJobName=uid,
        IdentifyLanguage= True,
        MediaFormat='mp3',
        Media={
            'MediaFileUri': object_url
        },
        OutputBucketName='my-tour-clips-transcriptions',
        OutputKey=file_name + '.txt'
        )
    return response



def getTranscriptionJob(file_name):
    while True:
        status = transcribe.get_transcription_job(
                TranscriptionJobName=file_name.replace('/','')[:10]
                )
        if status['TranscriptionJob']['TranscriptionJobStatus'] in ['COMPLETED', 'FAILED']:
            break
    return status