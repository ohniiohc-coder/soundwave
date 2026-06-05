# whatpl — 음악 스트리밍 서비스

Spotify 스타일 개인 음악 스트리밍 서비스. 음원 업로드 → Airflow 메타데이터 파이프라인 → 스트리밍 재생 + 소셜 기능(팔로우·DM·프로필·아바타).

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Zustand, react-easy-crop |
| Backend | Python FastAPI, SQLAlchemy (async), mutagen |
| 인증 | JWT (python-jose), bcrypt |
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

`.env`의 주요 환경 변수:

| 변수 | 설명 |
|------|------|
| `JWT_SECRET_KEY` | JWT 서명 키. 프로덕션에서 반드시 변경 |
| `POSTGRES_*` | DB 접속 정보 |
| `S3_*` / `MINIO_*` | 스토리지 접속 정보 |

### 2. 전체 스택 실행

```bash
docker compose up -d
```

최초 실행 시 이미지 빌드 및 Airflow 초기화로 약 3~5분 소요됩니다.

### 3. 접속 주소

| 서비스 | URL | 계정 |
|--------|-----|------|
| 프론트엔드 | http://localhost:3000 | - |
| 백엔드 API Docs | http://localhost:8000/docs | - |
| Airflow UI | http://localhost:8080 | admin / adminpassword |
| MinIO 콘솔 | http://localhost:9101 | minioadmin / minioadmin |

> **주의**: MinIO API 포트는 9100, 콘솔 포트는 9101입니다 (Docker Desktop 기본 9000/9001 포트 충돌 회피).

### 4. 재부팅 후 백엔드가 안 뜰 때

```bash
docker compose restart backend
```

재부팅 직후 Docker 내부 DNS 준비 전에 backend가 먼저 시작되는 타이밍 문제입니다.

---

## 프로젝트 구조

```
.
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx              # 홈 (지금 듣는 중 · 최신 앨범 · 아티스트)
│       │   ├── template.tsx          # 페이지 전환 애니메이션
│       │   ├── browse/               # 통합 검색 (트랙·앨범·아티스트·사람)
│       │   ├── albums/               # 앨범 목록
│       │   ├── album/[id]/           # 앨범 상세
│       │   ├── artists/              # 아티스트 목록
│       │   ├── artist/[id]/          # 아티스트 상세
│       │   ├── playlists/            # 플레이리스트 목록
│       │   ├── playlists/[id]/       # 플레이리스트 상세
│       │   ├── settings/             # 프로필 편집 (아바타·표시명·바이오·비공개 설정)
│       │   ├── users/[username]/     # 유저 프로필 (팔로우·DM 버튼, 팔로우 요청 관리)
│       │   ├── upload/               # 음악 업로드 (어드민)
│       │   ├── login/
│       │   └── register/             # 실시간 아이디 중복 검사 포함
│       ├── components/
│       │   ├── Sidebar.tsx           # 내비게이션 사이드바 (hover 확장, 아바타 표시)
│       │   ├── Player.tsx            # 하단 플로팅 pill 플레이어
│       │   ├── QueuePanel.tsx        # 재생 대기열 패널 (플레이어 위 팝업)
│       │   ├── DMPanel.tsx           # DM 플로팅 패널 (inbox·새 메시지·채팅)
│       │   ├── NowPlayingOrbs.tsx    # 홈 — 팔로잉 유저 현재 재생 중 floating orb
│       │   ├── AvatarCropModal.tsx   # 프로필 사진 원형 크롭 모달 (react-easy-crop)
│       │   ├── PlayerSection.tsx
│       │   ├── ContentArea.tsx
│       │   ├── AuthInit.tsx
│       │   ├── TrackList.tsx
│       │   ├── AlbumCard.tsx
│       │   ├── ArtistCard.tsx
│       │   └── AddToPlaylistButton.tsx
│       ├── store/
│       │   ├── playerStore.ts        # 재생 상태 (셔플·반복 포함)
│       │   ├── dmPanelStore.ts       # DM 패널 열림/뷰 상태
│       │   └── authStore.ts
│       └── lib/
│           └── api.ts                # API 클라이언트 (JWT 헤더 자동 포함)
├── backend/
│   ├── main.py                       # FastAPI 앱 + DB 마이그레이션
│   ├── database.py
│   ├── models.py                     # SQLAlchemy ORM 모델
│   ├── schemas.py                    # Pydantic 스키마
│   ├── routers/
│   │   ├── auth.py                   # 회원가입·로그인·프로필 수정·아이디 중복 확인
│   │   ├── users.py                  # 유저 검색·공개 프로필·팔로우·아바타 업로드
│   │   ├── messages.py               # DM (대화 목록·스레드·전송·읽음 처리)
│   │   ├── tracks.py
│   │   ├── albums.py
│   │   ├── artists.py
│   │   ├── playlists.py
│   │   ├── queue.py
│   │   ├── recent_contexts.py
│   │   ├── upload.py
│   │   └── search.py
│   └── utils/
│       ├── auth.py                   # JWT·bcrypt·선택적 인증
│       ├── metadata.py
│       └── storage.py
├── airflow/
│   └── dags/
├── k8s/
├── docker-compose.yml
└── .env.example
```

---

## 주요 기능

### 인증 · 계정
- **회원가입**: 이름(표시명, 중복 허용) + @사용자이름(고유 ID, 실시간 중복 확인) + 비밀번호
- **로그인**: JWT 발급 (7일 유효), localStorage 저장
- **유저 역할**: `user` (일반), `admin` (업로드·편집 권한)
- **토큰 검증**: 앱 시작 시 `GET /api/auth/me`로 자동 검증 (만료 시 자동 로그아웃)

### 소셜
- **프로필 편집** (`/settings`): 표시명·바이오 편집, 비공개 계정 전환, 프로필 사진 업로드
- **프로필 사진**: 원형 크롭 모달 → 400×400 JPEG 변환 → S3/MinIO 저장. 사이드바 아이콘 및 지금 듣는 중 orb에 반영
- **비공개 계정**: 팔로우 시 승인 요청 발송 → 계정 소유자가 수락/거절
- **팔로우/언팔로우**: 공개 계정은 즉시, 비공개 계정은 요청 후 승인 시 성립
- **통합 검색** (`/browse`): 트랙·앨범·아티스트·사람을 탭으로 구분해 한 화면에서 검색
- **DM 플로팅 패널**: 화면 우하단 버튼으로 열리는 오버레이 패널 (inbox·새 메시지·채팅). 페이지 이동 없이 어디서든 접근 가능
- **지금 듣는 중**: 홈 화면 상단에 팔로잉 유저가 현재 재생 중인 곡을 floating orb로 표시. hover 시 앨범 아트 + 곡 정보 카드, 15초 폴링

### 음악 관리
- **자동 메타데이터 추출**: MP3/FLAC/M4A 태그 자동 파싱 (트랙명·아티스트·앨범·연도·장르)
- **앨범 아트 공유**: 앨범 단위 커버 이미지 1개 저장
- **임베디드 커버 추출**: 음원 내 커버 아트 자동 추출 → S3 저장
- **Airflow 파이프라인**: 업로드 후 비동기 메타데이터 보강 (`music_processing` DAG)

### 재생
- **HTTP Range 스트리밍**: Seek 지원 (MP3/FLAC/M4A/WAV/OGG)
- **두 가지 재생 모드**: 큐(단일 트랙 추가) / 컨텍스트(앨범·플레이리스트 전체 재생)
- **재생 대기열 영속**: 새로고침 후에도 유지 (DB 저장, 유저별 독립)
- **재생 대기열 패널**: 드래그 순서 변경, 개별 제거, 최근 재생 드롭다운 (플레이어 위 팝업 슬라이드)
- **셔플**: 랜덤 순서 재생
- **반복 재생**: 전체 반복 / 한 곡 반복 (off → all → one 순환). 한 곡 반복이 셔플보다 우선 적용
- **플로팅 pill UI**: 하단 중앙 고정 pill 형태 컨트롤바, 진행 바 인라인 표시

### 플레이리스트
- 생성·이름 변경·삭제, 트랙 추가·순서 변경·제거
- 유저별 소유 (본인 소유만 수정 가능)

---

## 어드민 기능

업로드·편집·삭제는 `admin` 역할 계정이 필요합니다.

```bash
# curl 업로드 예시 (admin JWT)
curl -X POST http://localhost:8000/api/upload \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -F "file=@/path/to/song.mp3"
```

---

## API 참조

### 인증
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/auth/register` | 회원가입 → JWT 반환 |
| `POST` | `/api/auth/login` | 로그인 → JWT 반환 |
| `GET` | `/api/auth/me` | 현재 유저 정보 (Bearer 필요) |
| `PUT` | `/api/auth/me` | 프로필 수정 (display_name, bio, is_private) |
| `GET` | `/api/auth/check-username?username=` | 아이디 중복 확인 |

### 유저 · 소셜
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/users?q=` | 유저 검색 (관리자 제외) |
| `GET` | `/api/users/{username}` | 공개 프로필 조회 (username 기반) |
| `POST` | `/api/users/me/avatar` | 프로필 사진 업로드 (multipart/form-data) |
| `PUT` | `/api/users/me/now-playing` | 현재 재생 중 곡 업데이트 |
| `POST` | `/api/users/{id}/follow` | 팔로우 (비공개 시 요청 발송) |
| `DELETE` | `/api/users/{id}/follow` | 언팔로우 또는 요청 취소 |
| `GET` | `/api/users/{id}/followers` | 팔로워 목록 |
| `GET` | `/api/users/{id}/following` | 팔로잉 목록 |
| `GET` | `/api/users/{id}/playlists` | 공개 플레이리스트 (비공개 계정은 팔로워만) |
| `GET` | `/api/users/me/requests` | 내게 온 팔로우 요청 목록 |
| `POST` | `/api/users/me/requests/{id}/accept` | 팔로우 요청 수락 |
| `DELETE` | `/api/users/me/requests/{id}` | 팔로우 요청 거절 |

### DM
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/messages` | 대화 목록 (최신순) |
| `GET` | `/api/messages/unread` | 전체 안읽은 메시지 수 |
| `GET` | `/api/messages/{user_id}` | 특정 유저와의 메시지 (읽음 처리 포함) |
| `POST` | `/api/messages/{user_id}` | 메시지 전송 |

### 트랙
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/tracks` | 트랙 목록 |
| `GET` | `/api/tracks/{id}/stream?token=` | 오디오 스트리밍 (JWT 필수) |
| `PUT` | `/api/tracks/{id}` | 트랙 정보 수정 |
| `DELETE` | `/api/tracks/{id}` | 트랙 삭제 (어드민) |

### 앨범
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/albums` | 앨범 목록 |
| `GET` | `/api/albums/{id}` | 앨범 상세 (트랙 포함) |
| `PUT` | `/api/albums/{id}` | 앨범 정보 수정 |
| `POST` | `/api/albums/{id}/cover` | 커버 이미지 업로드 (어드민) |
| `DELETE` | `/api/albums/{id}` | 앨범 삭제 (어드민) |

### 아티스트
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/artists` | 아티스트 목록 |
| `GET` | `/api/artists/{id}` | 아티스트 상세 (앨범 포함) |
| `PUT` | `/api/artists/{id}` | 아티스트 정보 수정 |
| `POST` | `/api/artists/{id}/image` | 프로필 이미지 업로드 (어드민) |
| `DELETE` | `/api/artists/{id}` | 아티스트 삭제 (어드민) |

### 플레이리스트 (JWT 필수)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/playlists` | 내 플레이리스트 목록 |
| `POST` | `/api/playlists` | 생성 |
| `GET` | `/api/playlists/{id}` | 상세 (트랙 포함) |
| `PUT` | `/api/playlists/{id}` | 이름 변경 |
| `DELETE` | `/api/playlists/{id}` | 삭제 |
| `POST` | `/api/playlists/{id}/tracks` | 트랙 추가 |
| `PUT` | `/api/playlists/{id}/tracks/reorder` | 순서 변경 |
| `DELETE` | `/api/playlists/{id}/items/{item_id}` | 트랙 제거 |

### 재생 대기열 · 최근 재생 (JWT 필수)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/queue` | 대기열 조회 |
| `PUT` | `/api/queue` | 대기열 저장 |
| `GET` | `/api/recent-contexts` | 최근 재생 최대 5개 |
| `POST` | `/api/recent-contexts` | 최근 재생 upsert |

### 검색 · 업로드
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/search?q=` | 트랙·앨범·아티스트 통합 검색 |
| `POST` | `/api/upload` | 음악 파일 업로드 (어드민) |

---

## AWS EKS 배포

```bash
# 1. ECR 리포지토리 생성
aws ecr create-repository --repository-name whatpl-backend --region ap-northeast-2
aws ecr create-repository --repository-name whatpl-frontend --region ap-northeast-2

# 2. 이미지 빌드 & 푸시
ECR_URI=123456789.dkr.ecr.ap-northeast-2.amazonaws.com
docker build -t $ECR_URI/whatpl-backend:latest ./backend
docker build -t $ECR_URI/whatpl-frontend:latest ./frontend
docker push $ECR_URI/whatpl-backend:latest
docker push $ECR_URI/whatpl-frontend:latest

# 3. EKS 클러스터 생성
eksctl create cluster \
  --name whatpl \
  --region ap-northeast-2 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 3

# 4. 시크릿 생성
kubectl create secret generic whatpl-secrets \
  --namespace whatpl \
  --from-literal=DATABASE_URL="postgresql+asyncpg://user:pass@RDS_ENDPOINT:5432/whatpldb" \
  --from-literal=JWT_SECRET_KEY="your-secure-random-key" \
  --from-literal=S3_ACCESS_KEY="AWS_ACCESS_KEY" \
  --from-literal=S3_SECRET_KEY="AWS_SECRET_KEY"

# 5. 배포
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml
```

`k8s/` 매니페스트의 `YOUR_ECR_REPO`, `YOUR_DOMAIN`, `YOUR_ACM_CERTIFICATE_ARN`을 실제 값으로 교체하세요.

### Airflow Fernet Key 생성

```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```
