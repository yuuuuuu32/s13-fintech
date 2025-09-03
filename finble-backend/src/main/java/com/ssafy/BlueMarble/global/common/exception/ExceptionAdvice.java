 package com.ssafy.BlueMarble.global.common.exception;

 import lombok.extern.slf4j.Slf4j;
 import org.springframework.http.HttpStatus;
 import org.springframework.web.ErrorResponse;
 import org.springframework.web.bind.annotation.ExceptionHandler;
 import org.springframework.web.bind.annotation.RestControllerAdvice;

 @Slf4j
 @RestControllerAdvice
 public class ExceptionAdvice {

     @ExceptionHandler(BusinessException.class)
     public ErrorResponse businessExceptionHandler(BusinessException exception) {
         BusinessError businessError = exception.getBusinessError();
         log.warn("[{}] : {}", businessError.name(), businessError.getMessage());
         exception.printStackTrace();
         return ErrorResponse
                 .builder(exception, businessError.getHttpStatus(), businessError.getMessage())
                 .title(businessError.name())
                 .build();
     }

     @ExceptionHandler(RuntimeException.class)
     public ErrorResponse businessExceptionHandler(RuntimeException exception) {

         log.warn("[{}", exception.getMessage());
         exception.printStackTrace();
         return ErrorResponse
                 .builder(exception, HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류")
                 .title("서버 내부 오류")
                 .build();
     }


 }