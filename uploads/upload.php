<?php
require 'vendor/autoload.php';
ini_set('max_execution_time', '0');
error_reporting(E_ALL);
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: *');
header("Access-Control-Allow-Headers: *");
$json2FileName = $_POST["json2_file_name"];
$json2 = $_POST["json2"];
$newPhotos = $_POST["photos"];
$s3 = new Aws\S3\S3Client([
    'region'  => 'us-east-1',
    'version' => 'latest',
    'credentials' => [
        'key'    => "AKIA545BREMMDLIVK6BO",
        'secret' => "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",
    ]
]);
if ($json2 != null) {
    try{
        $json2 = json_decode($json2, true);
    }catch (Exception $exception){
        echo json_encode(["status" => false, "error"=>"Metadata is invalid: ". $exception->getMessage()]);
        return;
    }
}
if ($newPhotos != null) {
    try{
        $newPhotos = json_decode($newPhotos, true);
    }catch (Exception $exception){
        echo json_encode(["status" => false, "error"=>"New photos are invalid: ". $exception->getMessage()]);
        return;
    }
}

$tempFolder = "";

foreach ($newPhotos as $key => $value) {
    try{
        copy($value, $tempFolder.$key);
        $result = $s3->putObject([
            'Bucket' => 'livecapture-420',
            'Key'    => $tempFolder.$key,
            'SourceFile'   => $tempFolder.$key,
        ]);
        unlink($tempFolder.$key);
    }catch (Exception $exception){
        echo json_encode(["status" => false, "error"=>"Error occurred when storing the photos: ". $exception->getMessage()]);
        return;
    }

}
$isAudioExist = false;
if (sizeof($json2["CLIPS"]) > 0) {
    try{
        $isAudioExist = copy("https://livecapture-420.s3.amazonaws.com/".$json2FileName.".mp3", $tempFolder.$json2FileName.".mp3");
    }catch (Exception $exception){
        echo $exception->getMessage();
        $isAudioExist = false;
    }
}
foreach ($json2["CLIPS"] as $index => $clip){
    if ($clip["CLIP_FILE"] == ""){
        $output = null;
        $output_clip_file = $tempFolder.$json2FileName."_".$index."_clip.mp3";
        if ($isAudioExist){
            exec("ffmpeg -i ".$tempFolder.$json2FileName.".mp3 -ss ".$clip["START"]." -to ".$clip["END"]." -c:a copy ".$output_clip_file, $output);
        }
        if (file_exists($output_clip_file)){
            try{
                $result = $s3->putObject([
                    'Bucket' => 'livecapture-420',
                    'Key'    => $output_clip_file,
                    'SourceFile'   => $output_clip_file,
                ]);
                $json2["CLIPS"][$index]["CLIP_FILE"] = $output_clip_file;
                unlink($output_clip_file);
            }catch (Exception $exception){

            }

        }
    }
}
try {
//    $fp = fopen($tempFolder.$json2FileName.'.json2', 'w');
//    fwrite($fp, json_encode($json2));
//    fclose($fp);
    $key = $tempFolder.$json2FileName.'.json2';
    $result = $s3->putObject([
        'Bucket' => 'livecapture-420',
        'Key'    => $key,
        'Body'   => json_encode($json2),
		'ContentType' => 'text/plain',
        //'SourceFile' => 'c:\samplefile.png' -- use this if you want to upload a file from a local location
    ]);
} catch (Exception $exception){
    echo json_encode(["status" => false, "error"=>"Error occurred when storing the metadata: ". $exception->getMessage()]);
    return;
}

if (file_exists($tempFolder.$json2FileName.".mp3")) {
    try{
        unlink($tempFolder.$json2FileName.".mp3");
    }catch (Exception $exception){

    }
}

echo json_encode(["status" => true]);
