import { useRef, useEffect } from 'react';
import { Vector3, HemisphericLight, MeshBuilder, Engine, ArcRotateCamera, StandardMaterial, Color3, Scene, VideoDome, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';

// メインのReactコンポーネント
const App = () => {
  // キャンバス要素への参照を作成
  // useRefにHTMLCanvasElementまたはnullの型を指定
  const reactCanvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // キャンバスが利用可能であることを確認
    if (!reactCanvas.current) {
      console.error("キャンバス要素が見つかりませんでした。");
      return;
    }

    // Babylon.jsエンジンを初期化
    // BABYLONオブジェクトはグローバルスコープで利用可能と想定
    const engine: Engine = new Engine(reactCanvas.current, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
    // シーンを作成
    const scene: Scene = new Scene(engine);
    

      scene.ambientColor = new Color3(1, 1, 1);

      // カメラを作成し、シーンに追加
      const camera = new ArcRotateCamera("camera1", Math.PI / 2, Math.PI / 2, 5, Vector3.Zero(), scene);
      // カメラをキャンバス入力にアタッチ
      camera.attachControl(reactCanvas.current, true);
      camera.lowerRadiusLimit = 2;
      camera.upperRadiusLimit = 20;

      // ライトを作成し、シーンに追加
      // HemisphereLightは、空から地面に光を当て、影のないソフトな照明を作成します。
      const light: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
      light.intensity = 1.5; // ライトの強度を設定

      const videoDome = new VideoDome(
          "videoDome",
          "/babylontest/movie01.mp4", // 動画のURL
          {
              resolution: 32,
              size: 1000,
              autoPlay: false,
          },
          scene
      );

      // ブラウザの自動再生ポリシーのため、ビデオの音声をミュートに設定
      videoDome.videoTexture.video.muted = true;

      // --- 球体の色と動画URLを定義 ---
    const redColor = new Color3(0.8, 0.2, 0.2);
    const blueColor = new Color3(0.2, 0.2, 0.8);
    const yellowColor = new Color3(1, 1, 0); // 緑から黄色に変更
    const highlightColor = new Color3(1, 1, 1); // ハイライト色を白に変更

    // 各球体に対応する動画のURLに置き換えてください
    const redVideoUrl = "/babylontest/movie01.mp4";
    const blueVideoUrl = "/babylontest/movie02.mp4"; // 仮のURL
    const yellowVideoUrl = "/babylontest/movie03.mp4"; // 仮のURL

    // --- 赤い球体を作成 ---
    const redSphere = MeshBuilder.CreateSphere("redSphere", { diameter: 0.5, segments: 32 }, scene);
    redSphere.position = new Vector3(-1.5, 0.5, 0);
    const redSphereMaterial = new StandardMaterial("redSphereMaterial", scene);
    redSphereMaterial.diffuseColor = redColor;
    redSphere.material = redSphereMaterial;

    // --- 青い球体を作成 ---
    const blueSphere = MeshBuilder.CreateSphere("blueSphere", { diameter: 0.5, segments: 32 }, scene);
    blueSphere.position = new Vector3(0, 0.5, 0);
    const blueSphereMaterial = new StandardMaterial("blueSphereMaterial", scene);
    blueSphereMaterial.diffuseColor = blueColor;
    blueSphere.material = blueSphereMaterial;

    // --- 黄色い球体を作成 ---
    const yellowSphere = MeshBuilder.CreateSphere("yellowSphere", { diameter: 0.5, segments: 32 }, scene);
    yellowSphere.position = new Vector3(1.5, 0.5, 0);
    const yellowSphereMaterial = new StandardMaterial("yellowSphereMaterial", scene);
    yellowSphereMaterial.diffuseColor = yellowColor;
    yellowSphere.material = yellowSphereMaterial;

    // --- GUIテキストラベルの作成 ---
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    const createSphereLabel = (text: string, sphereToLink: any) => {
        const label = new TextBlock();
        label.text = text;
        label.color = "white";
        label.fontSize = 24;
        label.fontWeight = "bold";
        advancedTexture.addControl(label);
        label.linkWithMesh(sphereToLink);
        label.linkOffsetY = -50; // 球体からの垂直オフセット
        return label;
    };

    createSphereLabel("動画1", redSphere);
    createSphereLabel("動画2", blueSphere);
    createSphereLabel("動画3", yellowSphere);

    // --- クリックイベントのロジック ---
    let currentlyPlaying: {
        sphere: any;
        material: StandardMaterial;
        originalColor: Color3;
    } | null = null;

    const createSphereClickHandler = (
        sphere: any, 
        material: StandardMaterial, 
        originalColor: Color3, 
        videoUrl: string
    ) => {
        return () => {
            const video = videoDome.videoTexture.video;

            // すでにこの球体の動画が再生中の場合
            if (currentlyPlaying?.sphere === sphere) {
                video.pause();
                video.currentTime = 0;
                video.muted = true;
                material.diffuseColor = originalColor;
                currentlyPlaying = null;
            } else {
                // 他の動画が再生中だった場合、それを元の色に戻す
                if (currentlyPlaying) {
                    currentlyPlaying.material.diffuseColor = currentlyPlaying.originalColor;
                }

                // 新しい動画を再生
                video.src = videoUrl;
                video.load();
                video.play();
                video.muted = false;
                material.diffuseColor = highlightColor;
                
                currentlyPlaying = {
                    sphere: sphere,
                    material: material,
                    originalColor: originalColor,
                };
            }
        };
    };

    // 各球体にクリックイベントを割り当て
    redSphere.actionManager = new ActionManager(scene);
    redSphere.actionManager.registerAction(
        new ExecuteCodeAction(
            ActionManager.OnPickTrigger,
            createSphereClickHandler(redSphere, redSphereMaterial, redColor, redVideoUrl)
        )
    );

    blueSphere.actionManager = new ActionManager(scene);
    blueSphere.actionManager.registerAction(
        new ExecuteCodeAction(
            ActionManager.OnPickTrigger,
            createSphereClickHandler(blueSphere, blueSphereMaterial, blueColor, blueVideoUrl)
        )
    );
    
    yellowSphere.actionManager = new ActionManager(scene);
    yellowSphere.actionManager.registerAction(
        new ExecuteCodeAction(
            ActionManager.OnPickTrigger,
            createSphereClickHandler(yellowSphere, yellowSphereMaterial, yellowColor, yellowVideoUrl)
        )
    );

      // --- 反射する地面の作成 ---
      const ground = MeshBuilder.CreateGround("ground", { width: 512, height: 512 }, scene);
      const groundMaterial = new StandardMaterial("groundMaterial", scene);
      groundMaterial.alpha = 0; // 地面を透明にする
      ground.material = groundMaterial;

      // VR空間での床としてgroundメッシュを指定
      scene.createDefaultXRExperienceAsync({
          floorMeshes: [ground] // VR空間での床としてgroundメッシュを指定
      }).catch(e => {
          console.error("WebXRの初期化に失敗しました: ", e);
      });

      // シーンのレンダリングループを開始
      const renderLoop = () => {
          if (scene && !scene.isDisposed) {
              scene.render();
          }
      };
      engine.runRenderLoop(renderLoop);
      
      // ウィンドウのリサイズ時にエンジンのサイズも変更
      const handleResize = () => {
          engine.resize();
      };
      window.addEventListener('resize', handleResize);

      // コンポーネントのアンマウント時にBabylon.jsエンジンを破棄
      return () => {
          window.removeEventListener('resize', handleResize);
          engine.dispose();
          scene.dispose();
      };
  }, []); // 空の依存配列は、コンポーネントがマウントされたときに一度だけ実行されることを保証します

  return (
        <div className="flex items-center justify-center w-screen h-screen bg-gray-900">
            <div className="w-full h-full">
                {/* Babylon.jsがレンダリングされるキャンバス要素 */}
                <canvas ref={reactCanvas} className="w-full h-full block focus:outline-none"></canvas>
            </div>
        </div>
  );
};

export default App;
