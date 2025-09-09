-- Initial data for BlueMarble game
USE bluemarble;

-- cities 데이터 삽입
INSERT IGNORE INTO cities (name, korean_name, price)
VALUES ('IKSAN', '익산', 50),
       ('SUNCHEON', '순천', 60),
       ('ASAN', '아산', 70),
       ('BUSAN', '부산', 200),
       ('CHEONGJU', '청주', 90),
       ('CHEONAN', '천안', 100),
       ('MOKPO', '목포', 110),
       ('YEOSU', '여수', 120),
       ('NAJU', '나주', 130),
       ('GWANGJU', '광주', 180),
       ('POHANG', '포항', 150),
       ('GIMCHEON', '김천', 160),
       ('DAEGU', '대구', 170),
       ('GUMI', '구미', 160),
       ('DAEJEON', '대전', 180),
       ('SUWON', '수원', 200),
       ('INCHEON', '인천', 210),
       ('GOYANG', '고양', 220),
       ('CHANGWON', '창원', 230),
       ('SEOUL', '서울', 220),
       ('SEONGNAM', '성남', 250),
       ('GWACHEON', '과천', 270),
       ('HANAM', '하남', 285),
       ('INCHEON2', '인천', 300);

-- cards 데이터 삽입
INSERT IGNORE INTO cards (card_name, card_type, description, effect_value)
VALUES
('천사카드', 'ANGEL', '부정적인 효과가 발생할 때 사용하여 회피 가능', 0),
('금리 인상', 'INSTANT', '모든 플레이어의 현금이 10% 감소', 10),
('금리 인하', 'INSTANT', '모든 플레이어의 현금이 10% 증가', 10),
('부동산 호황', 'INSTANT', '모든 땅값이 20% 상승', 20),
('부동산 불황', 'INSTANT', '모든 땅값이 20% 하락', 20),
('세금 납부', 'INSTANT', '보유 현금의 15% 납부', 15),
('복권 당첨', 'INSTANT', '50만원 획득', 500000),
('사기 피해', 'INSTANT', '30만원 손실', 300000),
('감옥행', 'INSTANT', '즉시 감옥으로 이동', 0),
('시작점 이동', 'INSTANT', '시작점으로 이동하여 월급 받기', 0),
('무료 건설', 'INSTANT', '다음 건설 시 50% 할인', 50),
('땅값 동결', 'INSTANT', '3턴간 모든 통행료 면제', 3),
('강제 이주', 'INSTANT', '상대방을 원하는 위치로 이동', 0);

-- user 데이터 삽입
INSERT IGNORE INTO user (
    id, created_at, email, name, nickname, password, provider, role, fcm_token
) VALUES
      (1, '2025-08-08 14:00:00', 'user1@example.com', 'User One', 'userone', 'password1', 'GOOGLE', 'USER', 'fcm_token_1'),
      (2, '2025-08-08 14:05:00', 'user2@example.com', 'User Two', 'usertwo', 'password2', 'KAKAO', 'USER', 'fcm_token_2'),
      (3, '2025-08-08 14:10:00', 'user3@example.com', 'User Three', 'userthree', 'password3', 'GOOGLE', 'USER', 'fcm_token_3'),
      (4, '2025-08-08 14:15:00', 'user4@example.com', 'User Four', 'userfour', 'password4', 'KAKAO', 'USER', 'fcm_token_4'),
      (5, '2025-08-08 14:20:00', 'user5@example.com', 'User Five', 'userfive', 'password5', 'GOOGLE', 'ADMIN', 'fcm_token_5'),
      (6, '2025-08-08 14:25:00', 'user6@example.com', 'User Six', 'usersix', 'password6', 'KAKAO', 'USER', 'fcm_token_6');