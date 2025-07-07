import { useRef, useEffect, useState } from 'react';
import { 
    Vector3, 
    HemisphericLight, 
    MeshBuilder, 
    Engine, 
    ArcRotateCamera, 
    StandardMaterial, 
    Color3, 
    Scene, 
    VideoDome, 
    ActionManager, 
    ExecuteCodeAction,
    Mesh,
    WebXRInputSource
} from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';

// メインのReactコンポーネント
const App = () => {
    // キャンバス要素への参照を作成
    // useRefにHTMLCanvasElementまたはnullの型を指定
    const reactCanvas = useRef<HTMLCanvasElement | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 動画URL
        const redVideoUrl = "/babylontest/video/movie01.mp4";
        const blueVideoUrl = "/babylontest/video/movie02.mp4";
        const yellowVideoUrl = "/babylontest/video/movie03.mp4";

        // 動画のプリロード
        const preloadVideo = (url: string) => {
            return new Promise<void>((resolve, reject) => {
                const video = document.createElement('video');
                video.src = url;
                video.preload = "auto";
                video.muted = true;
                video.oncanplaythrough = () => resolve();
                video.onerror = (e) => {
                    console.error(`Error preloading video: ${url}`, e);
                    reject();
                };
            });
        };

        Promise.all([
            preloadVideo(redVideoUrl),
            preloadVideo(blueVideoUrl),
            preloadVideo(yellowVideoUrl)
        ]).then(() => {
            setIsLoading(false);
        }).catch(() => {
            console.error("Failed to preload one or more videos.");
            setIsLoading(false); // エラー時もシーンの初期化は試みる
        });
    }, []);

    useEffect(() => {
        if (isLoading) return;
        // キャンバスが利用可能であることを確認
        if (!reactCanvas.current) {
            console.error("キャンバス要素が見つかりませんでした。");
            return;
        }

        // Babylon.jsエンジンを初期化
        const engine: Engine = new Engine(reactCanvas.current, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
        // シーンを作成
        const scene: Scene = new Scene(engine);
        scene.ambientColor = new Color3(1, 1, 1);

        // カメラを作成し、シーンに追加
        const camera = new ArcRotateCamera("camera1", Math.PI / 2, Math.PI / 2, 5, Vector3.Zero(), scene);
        camera.attachControl(reactCanvas.current, true);
        camera.lowerRadiusLimit = 2;
        camera.upperRadiusLimit = 20;

        // ライトを作成し、シーンに追加
        const light: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
        light.intensity = 1.5;

        // 360度ビデオ用のVideoDomeを作成
        const videoDome = new VideoDome(
            "videoDome",
            "/babylontest/video/movie01.mp4",
            {
                resolution: 32,
                size: 1000,
                autoPlay: false,
            },
            scene
        );
        videoDome.videoTexture.video.muted = true;

        // --- 球体の色と動画URLを定義 ---
        const redColor = new Color3(0.8, 0.2, 0.2);
        const blueColor = new Color3(0.2, 0.2, 0.8);
        const yellowColor = new Color3(1, 1, 0);
        const highlightColor = new Color3(1, 1, 1);

        const redVideoUrl = "/babylontest/video/movie01.mp4";
        const blueVideoUrl = "/babylontest/video/movie02.mp4";
        const yellowVideoUrl = "/babylontest/video/movie03.mp4";

        // --- 赤い立方体を作成 ---
        const redBox = MeshBuilder.CreateBox("redBox", { size: 1 }, scene);
        redBox.position = new Vector3(-1.5, 1, 2); // 初期位置を調整
        const redBoxMaterial = new StandardMaterial("redBoxMaterial", scene);
        redBoxMaterial.diffuseColor = redColor;
        redBox.material = redBoxMaterial;

        // --- 青い立方体を作成 ---
        const blueBox = MeshBuilder.CreateBox("blueBox", { size: 1 }, scene);
        blueBox.position = new Vector3(0, 1, 2); // 初期位置を調整
        const blueBoxMaterial = new StandardMaterial("blueBoxMaterial", scene);
        blueBoxMaterial.diffuseColor = blueColor;
        blueBox.material = blueBoxMaterial;

        // --- 黄色い立方体を作成 ---
        const yellowBox = MeshBuilder.CreateBox("yellowBox", { size: 1 }, scene);
        yellowBox.position = new Vector3(1.5, 1, 2); // 初期位置を調整
        const yellowBoxMaterial = new StandardMaterial("yellowBoxMaterial", scene);
        yellowBoxMaterial.diffuseColor = yellowColor;
        yellowBox.material = yellowBoxMaterial;

        // --- GUIテキストラベルの作成 ---
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const createBoxLabel = (text: string, boxToLink: Mesh): TextBlock => {
            const label = new TextBlock();
            label.text = text;
            label.color = "white";
            label.fontSize = 24;
            label.fontWeight = "bold";
            advancedTexture.addControl(label);
            label.linkWithMesh(boxToLink);
            label.linkOffsetY = -50;
            return label;
        };

        const redLabel = createBoxLabel("動画1", redBox);
        const blueLabel = createBoxLabel("動画2", blueBox);
        const yellowLabel = createBoxLabel("動画3", yellowBox);

        // --- クリックイベントのロジック ---
        let currentlyPlaying: {
            box: Mesh;
            material: StandardMaterial;
            originalColor: Color3;
        } | null = null;

        const createBoxClickHandler = (
            box: Mesh, 
            material: StandardMaterial, 
            originalColor: Color3, 
            videoUrl: string
        ) => {
            return () => {
                const video = videoDome.videoTexture.video;
                if (currentlyPlaying?.box === box) {
                    video.pause();
                    video.currentTime = 0;
                    video.muted = true;
                    material.diffuseColor = originalColor;
                    currentlyPlaying = null;
                } else {
                    if (currentlyPlaying) {
                        currentlyPlaying.material.diffuseColor = currentlyPlaying.originalColor;
                    }
                    video.src = videoUrl;
                    video.load();
                    video.play();
                    video.muted = false;
                    material.diffuseColor = highlightColor;
                    currentlyPlaying = { box, material, originalColor };
                }
            };
        };

        // 各立方体にクリックイベントを割り当て
        redBox.actionManager = new ActionManager(scene);
        redBox.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, createBoxClickHandler(redBox, redBoxMaterial, redColor, redVideoUrl)));
        blueBox.actionManager = new ActionManager(scene);
        blueBox.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, createBoxClickHandler(blueBox, blueBoxMaterial, blueColor, blueVideoUrl)));
        yellowBox.actionManager = new ActionManager(scene);
        yellowBox.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, createBoxClickHandler(yellowBox, yellowBoxMaterial, yellowColor, yellowVideoUrl)));

        // --- 地面の作成 ---
        const ground = MeshBuilder.CreateGround("ground", { width: 512, height: 512 }, scene);
        const groundMaterial = new StandardMaterial("groundMaterial", scene);
        groundMaterial.alpha = 0;
        ground.material = groundMaterial;

        // --- VR体験の初期化とコントローラーへのアタッチ ---
        scene.createDefaultXRExperienceAsync({
            floorMeshes: [ground]
        }).then((xr) => {
            // VRモードが利用可能な場合のみ実行
            if (!xr.baseExperience) {
                console.log("WebXR not supported in this browser.");
                return;
            }

            // コントローラーが追加されたときの処理
            xr.input.onControllerAddedObservable.add((controller: WebXRInputSource) => {
                // 左コントローラーの場合のみ処理
                if (controller.inputSource.handedness === 'left') {
                    console.log("Left controller added");
                    
                    // コントローラーのグリップ（物理的な位置）を取得
                    const controllerNode = controller.grip ? controller.grip : controller.pointer;

                    // --- 立方体のサイズと位置をコントローラー用に調整 ---
                    const boxScale = 0.05; // コントローラーに対して適切なサイズに縮小
                    redBox.scaling.setAll(boxScale);
                    blueBox.scaling.setAll(boxScale);
                    yellowBox.scaling.setAll(boxScale);

                    // --- ラベルの見た目を調整 ---
                    const adjustLabel = (label: TextBlock) => {
                        label.fontSize = 100; // メッシュが小さくなるため、相対的にフォントサイズを大きくする
                        label.linkOffsetY = -15; // オフセットも調整
                    };
                    adjustLabel(redLabel);
                    adjustLabel(blueLabel);
                    adjustLabel(yellowLabel);

                    // --- 立方体をコントローラーの子要素にする ---
                    redBox.setParent(controllerNode);
                    blueBox.setParent(controllerNode);
                    yellowBox.setParent(controllerNode);

                    // --- コントローラーからの相対位置を設定 ---
                    // コントローラーの上部に水平に並べる
                    redBox.position = new Vector3(-0.1, 0.08, 0.05);
                    blueBox.position = new Vector3(0, 0.08, 0.05);
                    yellowBox.position = new Vector3(0.1, 0.08, 0.05);
                }
            });

        }).catch(e => {
            console.error("WebXRの初期化に失敗しました: ", e);
        });

        // --- シーンのレンダリングループを開始 ---
        engine.runRenderLoop(() => {
            // シーンとアクティブなカメラが利用可能なことを確認
            if (scene && !scene.isDisposed && scene.activeCamera) {
                // アクティブカメラの視錐台（表示領域）を取得
                const frustumPlanes = scene.frustumPlanes;

                // frustumPlanesが正しく取得できた場合のみ、表示チェックを実行
                if (frustumPlanes && frustumPlanes.length > 0) {
                    // 立方体とラベルの表示/非表示をチェックするヘルパー関数
                    const checkVisibility = (box: Mesh, label: TextBlock) => {
                        // isFrustumは、メッシュが視錐台に部分的にも入っている場合にtrueを返す
                        const isVisible = box.isInFrustum(frustumPlanes);
                        box.isVisible = isVisible;
                        label.isVisible = isVisible;
                    };

                    // 各立方体とラベルの可視性を更新
                    checkVisibility(redBox, redLabel);
                    checkVisibility(blueBox, blueLabel);
                    checkVisibility(yellowBox, yellowLabel);
                }

                // 最後にシーンをレンダリング
                scene.render();
            }
        });
        
        // ウィンドウのリサイズ時にエンジンのサイズも変更
        const handleResize = () => {
            engine.resize();
        };
        window.addEventListener('resize', handleResize);

        // コンポーネントのアンマウント時にリソースを解放
        return () => {
            window.removeEventListener('resize', handleResize);
            engine.dispose();
            scene.dispose();
        };
    }, [isLoading]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-screen h-screen bg-gray-900">
                <span style={{ color: "white", fontSize: 32 }}>Loading...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center w-screen h-screen bg-gray-900">
            <div className="w-full h-full">
                <canvas ref={reactCanvas} className="w-full h-full block focus:outline-none"></canvas>
            </div>
        </div>
    );
};

export default App;
