-- Airflow용 DB 생성 (musicdb는 POSTGRES_DB로 자동 생성됨)
CREATE DATABASE airflow;
GRANT ALL PRIVILEGES ON DATABASE airflow TO music;
