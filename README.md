# Soundwave - 음악 스트리밍 서비스

Spotify 스타일 음악 스트리밍 서비스. 음원 업로드 → Airflow 메타데이터 파이프라인 → 스트리밍 재생.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Zustand |
| Backend | Python FastAPI, SQLAlchemy (async), mutagen |
| DB | PostgreSQL 15 |
| 파이프라인 | Apache Airflow 2.8 (CeleryExecutor + Redis) |
| 스토리지 (로컬) | MinIO (S3 호환) |
| 스토리지 (프로덕션) | AWS S3 |
| 배포 | Docker Compose (로컬) / AWS EKS (프로덕션) |

---

## 로컬 개발 (Docker Compose)

### 1. 환경 변수 설정

```bash
cp .env.example .env
```

`.env`의 `ADMIN_API_KEY` 값이 업로드·삭제·편집 시 사용할 어드민 키입니다. 기본값: `change-me-in-production`

### 2. 전체 스택 실행

```bash
cd C:\Users\soldesk\Desktop\new_prj
docker-compose up -d
```

최초 실행 시 이미지 빌드 및 Airflow 초기화로 약 3~5분 소요됩니다.

### 3. 접속 주소

| 서비스 | URL | 계정 |
|--------|-----|------|
| 프론트엔드 | http://localhost:3000 | - |
| 백엔드 API Docs | http://localhost:8000/docs | - |
| Airflow UI | http://localhost:8080 | admin / adminpassword |
| MinIO 콘솔 | http://localhost:9101 | minioadmin / minioadmin |

> **주의**: MinIO API 포트는 9100, 콘솔 포트는 9101입니다 (Docker Desktop이 기본 9000/9001을 점유하여 변경됨).

### 4. 음악 업로드

사이트 좌측 사이드바 **업로드** 메뉴 → Admin API Key 입력 → 파일 드래그 앤 드롭

또는 curl:
```bash
curl -X POST http://localhost:8000/api/upload \
  -H "x-api-key: change-me-in-production" \
  -F "file=@/path/to/song.mp3"
```

### 5. 재부팅 후 백엔드가 안 뜰 때

```bash
docker-compose up -d
docker-compose restart backend
```

재부팅 직후 Docker 내부 DNS 준비 전에 backend가 먼저 시작되는 타이밍 문제입니다. `restart` 한 번으로 해결됩니다.

---

## 프로젝트 구조

```
.
├── frontend/                  # Next.js 14 앱
│   └── src/
│       ├── app/               # 페이지 (App Router)
│       │   ├── page.tsx       # 홈 (최신 앨범)
│       │   ├── browse/        # 검색 (트랙·앨범·아티스트)
│       │   ├── albums/        # 앨범 목록
│       │   ├── album/[id]/    # 앨범 상세
│       │   ├── artists/       # 아티스트 목록
│       │   ├── artist/[id]/   # 아티스트 상세
│       │   ├── playlists/     # 플레이리스트 목록
│       │   ├── playlists/[id]/ # 플레이리스트 상세
│       │   └── upload/        # 음악 업로드 (어드민)
│       ├── components/        # 공통 컴포넌트
│       │   ├── Player.tsx     # 하단 플레이어 바
│       │   ├── QueuePanel.tsx # 재생 대기열 패널 (노래/플레이리스트 탭)
│       │   ├── Sidebar.tsx    # 좌측 사이드바
│       │   ├── TrackList.tsx  # 트랙 목록
│       │   ├── AlbumCard.tsx  # 앨범 카드
│       │   ├── ArtistCard.tsx # 아티스트 카드
│       │   └── AddToPlaylistButton.tsx # 플레이리스트 추가 버튼
│       ├── store/
│       │   └── playerStore.ts # Zustand 플레이어 상태
│       └── lib/
│           └── api.ts         # API 클라이언트
├── backend/                   # FastAPI 백엔드
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── routers/
│   │   ├── tracks.py
│   │   ├── albums.py
│   │   ├── artists.py
│   │   ├── playlists.py
│   │   ├── queue.py           # 재생 대기열 (DB 영속)
│   │   ├── recent_contexts.py # 최근 재생 앨범/플레이리스트
│   │   ├── upload.py
│   │   └── search.py
│   └── utils/
│       ├── metadata.py        # mutagen 태그 추출
│       ├── storage.py         # S3/MinIO boto3 클라이언트
│       └── auth.py            # Admin API Key 인증
├── airflow/
│   └── dags/                  # music_processing DAG
├── k8s/                       # Kubernetes 매니페스트 (EKS)
├── scripts/                   # DB 초기화 스크립트
└── docker-compose.yml
```

---

## 주요 기능

### 음악 관리
- **자동 메타데이터 추출**: 업로드 시 MP3/FLAC/M4A 태그(ID3, Vorbis Comment 등) 자동 파싱 — 트랙명, 아티스트, 앨범, 발매연도, 장르
- **앨범 아트 공유**: 앨범 단위로 커버 이미지 1개 저장 → 트랙마다 중복 없음
- **임베디드 커버 추출**: 음원 파일에 내장된 커버 아트 자동 추출 후 S3 저장
- **Airflow 파이프라인**: 업로드 후 비동기로 메타데이터 보강 (`music_processing` DAG)

### 재생
- **HTTP Range 스트리밍**: Seek 지원 오디오 스트리밍 (MP3/FLAC/M4A/WAV/OGG)
- **두 가지 재생 모드**:
  - **노래 탭 (큐)**: 단일 트랙 클릭 시 재생 대기열에 추가
  - **플레이리스트 탭 (컨텍스트)**: 앨범·플레이리스트 "전체 재생" 시 컨텍스트로 재생 (큐와 독립)
- **재생 대기열 영속**: 페이지를 새로고침해도 대기열 유지 (DB에 자동 저장)
- **같은 앨범/플레이리스트 재생**: 이미 재생 중인 앨범/플레이리스트를 다시 재생하면 처음부터 재시작
- **재생 대기열 패널**: 드래그로 순서 변경, 개별 트랙 제거
- **하단 플레이어**: 이전/다음 곡, 재생시간 탐색, 볼륨 조절

### 편집 (Admin API Key 필요)
- **아티스트**: 이름 변경, 프로필 이미지 업로드/변경, 삭제 (하위 앨범·트랙 포함)
- **앨범**: 제목·발매연도·장르·설명 수정, 커버 이미지 변경, 삭제 (하위 트랙 포함)
- **트랙**: 개별 삭제 (S3 파일 포함)

### 플레이리스트
- 플레이리스트 생성·이름 변경·삭제
- 트랙 추가 (트랙 목록 우측 `+` 버튼)
- 드래그로 순서 변경, 개별 제거
- 전체 재생 (플레이리스트 탭에서 컨텍스트로 재생)

### 재생 대기열 패널 (하단 플레이어 우측 아이콘)
- **노래 탭**: 현재 재생 대기열. 드래그 순서 변경, 개별 삭제
- **플레이리스트 탭**: 현재 재생 중인 앨범 또는 플레이리스트. 드래그 순서 변경, 개별 삭제
  - 상단 드롭다운: 최근 재생한 앨범·플레이리스트 최대 5개 (앨범 = 디스크 아이콘, 플레이리스트 = 목록 아이콘)

### 탐색
- 아티스트·앨범·트랙 통합 검색
- 아티스트 페이지 → 앨범, 앨범 페이지 → 아티스트 링크

---

## 어드민 기능 사용법

업로드·편집·삭제 기능은 모두 **Admin API Key** 인증이 필요합니다.

- `.env`의 `ADMIN_API_KEY` 값을 사용
- UI의 API Key 입력란에 입력하면 해당 페이지에서 편집·삭제 가능
- curl 사용 시 `-H "x-api-key: YOUR_KEY"` 헤더 추가

---

## AWS EKS 배포

### 사전 준비

```bash
# 1. ECR 리포지토리 생성
aws ecr create-repository --repository-name music-backend --region ap-northeast-2
aws ecr create-repository --repository-name music-frontend --region ap-northeast-2

# 2. 이미지 빌드 & 푸시
ECR_URI=123456789.dkr.ecr.ap-northeast-2.amazonaws.com

docker build -t $ECR_URI/music-backend:latest ./backend
docker build -t $ECR_URI/music-frontend:latest ./frontend
docker push $ECR_URI/music-backend:latest
docker push $ECR_URI/music-frontend:latest

# 3. EKS 클러스터 생성 (eksctl)
eksctl create cluster \
  --name music-streaming \
  --region ap-northeast-2 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 3

# 4. 시크릿 생성
kubectl create secret generic music-streaming-secrets \
  --namespace music-streaming \
  --from-literal=DATABASE_URL="postgresql+asyncpg://user:pass@RDS_ENDPOINT:5432/musicdb" \
  --from-literal=S3_ACCESS_KEY="AWS_ACCESS_KEY" \
  --from-literal=S3_SECRET_KEY="AWS_SECRET_KEY" \
  --from-literal=ADMIN_API_KEY="your-secure-key" \
  --from-literal=AIRFLOW_PASSWORD="secure-password" \
  --from-literal=AIRFLOW_FERNET_KEY="your-fernet-key"

# 5. 배포
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/airflow/
kubectl apply -f k8s/ingress.yaml
```

k8s 매니페스트의 `YOUR_ECR_REPO`, `YOUR_DOMAIN`, `YOUR_ACM_CERTIFICATE_ARN`을 실제 값으로 교체하세요.

### Airflow Fernet Key 생성

```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

---

## API 참조

### 업로드
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/upload` | 음악 파일 업로드 (`x-api-key` 헤더 필요) |

### 트랙
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/tracks` | 트랙 목록 |
| `GET` | `/api/tracks/{id}` | 트랙 상세 |
| `GET` | `/api/tracks/{id}/stream` | 오디오 스트리밍 (Range 헤더 지원) |
| `PUT` | `/api/tracks/{id}` | 트랙 정보 수정 |
| `DELETE` | `/api/tracks/{id}` | 트랙 삭제 (`x-api-key` 필요, S3 파일 포함) |

### 앨범
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/albums` | 앨범 목록 |
| `GET` | `/api/albums/{id}` | 앨범 상세 (트랙 포함) |
| `PUT` | `/api/albums/{id}` | 앨범 정보 수정 |
| `POST` | `/api/albums/{id}/cover` | 앨범 커버 업로드 (`x-api-key` 필요) |
| `DELETE` | `/api/albums/{id}` | 앨범 삭제 (`x-api-key` 필요, 트랙·S3 포함) |

### 아티스트
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/artists` | 아티스트 목록 |
| `GET` | `/api/artists/{id}` | 아티스트 상세 (앨범 포함) |
| `PUT` | `/api/artists/{id}` | 아티스트 이름 수정 |
| `POST` | `/api/artists/{id}/image` | 프로필 이미지 업로드 (`x-api-key` 필요) |
| `DELETE` | `/api/artists/{id}` | 아티스트 삭제 (`x-api-key` 필요, 앨범·트랙·S3 포함) |

### 플레이리스트
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/playlists` | 플레이리스트 목록 |
| `POST` | `/api/playlists` | 플레이리스트 생성 |
| `GET` | `/api/playlists/{id}` | 플레이리스트 상세 (트랙 포함) |
| `PUT` | `/api/playlists/{id}` | 이름 변경 |
| `DELETE` | `/api/playlists/{id}` | 플레이리스트 삭제 |
| `POST` | `/api/playlists/{id}/tracks` | 트랙 추가 |
| `PUT` | `/api/playlists/{id}/tracks/reorder` | 트랙 순서 변경 |
| `DELETE` | `/api/playlists/{id}/tracks/{track_id}` | 트랙 제거 |

### 재생 대기열
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/queue` | 대기열 조회 (페이지 새로고침 시 복원용) |
| `PUT` | `/api/queue` | 대기열 저장 (track_ids 배열) |

### 최근 재생
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/recent-contexts` | 최근 재생한 앨범/플레이리스트 최대 5개 |
| `POST` | `/api/recent-contexts` | 최근 재생 upsert |

### 검색
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/search?q=` | 트랙·앨범·아티스트 통합 검색 |
